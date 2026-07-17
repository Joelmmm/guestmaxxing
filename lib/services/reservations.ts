import { prisma } from '@/lib/prisma'
import { checkAvailability, checkScheduleValidity } from '@/lib/availability'
import { toRestaurantDateFilter } from '@/lib/time-utils'
import { fromZonedTime } from 'date-fns-tz'
import { ReservationFormValues } from '@/lib/validations/reservation'

/**
 * Service Layer for Reservations
 * Contains raw business logic that is agnostic to HTTP definitions (Routes) or Next.js specifics.
 */

export async function getReservations(restaurantId: string, date?: string, status?: string) {
  const where: any = { restaurantId }

  if (date) {
    where.reservationDate = toRestaurantDateFilter(date)
  }
  if (status) {
    where.status = status
  }

  return await prisma.reservation.findMany({
    where,
    include: {
      restaurant: {
        select: { timezone: true },
      },
      guest: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
      tables: {
        include: {
          table: {
            select: { name: true, diningArea: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  })
}

export async function createReservation(data: ReservationFormValues, isInternal: boolean = false) {
  const {
    restaurantId,
    guestId,
    guestData,
    partySize,
    reservationDate,
    startTime,
    durationMins,
    tableIds,
  } = data

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { timezone: true }
  })

  if (!restaurant) {
    throw new Error('RESTAURANT_NOT_FOUND')
  }

  const localTimeStr = `${reservationDate} ${startTime}`
  const absoluteStartTime = fromZonedTime(localTimeStr, restaurant.timezone)
  const absoluteEndTime = new Date(absoluteStartTime.getTime() + (durationMins || 90) * 60_000)

  if (absoluteStartTime < new Date()) {
    throw new Error('PAST_RESERVATION')
  }

  const email = guestData?.email?.trim() || null;
  const phone = guestData?.phone?.trim() || null;

  // 1. Resolve Guest
  let resolvedGuestId = guestId

  if (!resolvedGuestId && guestData && (email || phone)) {
    // Find or create guest
    const existingGuest = await prisma.guest.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter((cond) => Object.keys(cond).length > 0),
      },
    })

    if (existingGuest) {
      resolvedGuestId = existingGuest.id
    } else {
      const newGuest = await prisma.guest.create({
        data: {
          firstName: guestData.firstName,
          lastName: guestData.lastName,
          email,
          phone,
        },
      })
      resolvedGuestId = newGuest.id
    }
  }

  if (!resolvedGuestId && guestData) {
    // Create guest even without unique identifiers
    const newGuest = await prisma.guest.create({
      data: {
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        email,
        phone,
      },
    })
    resolvedGuestId = newGuest.id
  }

  if (!resolvedGuestId) {
    throw new Error('GUEST_INFO_REQUIRED')
  }

  // 2 & 3. Transactional validation and creation
  let reservation;
  let retries = 3;
  while (retries > 0) {
    try {
      reservation = await prisma.$transaction(async (tx) => {
        let finalTableIds: string[] = []

        // ── Schedule gate: applies to BOTH manual and automatic paths ──────────
        // Without this, selecting a specific table bypasses override/hours checks.
        const scheduleCheck = await checkScheduleValidity({
          restaurantId,
          date: reservationDate,
          time: startTime,
          durationMins: durationMins || 90,
        }, tx)

        if (!scheduleCheck.valid) {
          if (scheduleCheck.reason === 'RESTAURANT_CLOSED') throw new Error('RESTAURANT_CLOSED')
          if (scheduleCheck.reason === 'NO_OPERATING_HOURS') throw new Error('NO_TABLES_AVAILABLE')
          throw new Error('OUTSIDE_OPERATING_HOURS')
        }

        // ────────────────────────────────────────────────────────────────────────

        if (tableIds && tableIds.length > 0) {
          // Specific table assignment (Manual Override)
          const overlapping = await tx.reservationOnTable.findFirst({
            where: {
              tableId: { in: tableIds },
              reservation: {
                status: { in: ['PENDING', 'CONFIRMED', 'WAITLISTED', 'ARRIVED', 'PARTIALLY_ARRIVED', 'SEATED'] },
                OR: [
                  {
                    startTime: { lt: absoluteEndTime },
                    endTime: { gt: absoluteStartTime },
                  },
                ],
              },
            },
          })

          if (overlapping) {
            throw new Error('SPECIFIC_TABLES_BOOKED')
          }
          finalTableIds = tableIds
        } else {
          // Dynamic Table Assignment (Standard Booking)
          const requestDate = reservationDate
          const requestTime = startTime

          const availability = await checkAvailability({
            restaurantId,
            date: requestDate,
            time: requestTime,
            partySize,
            absoluteStartTime,
            isInternal,
          }, tx)

          if (!availability.available || !availability.table) {
            if (availability.reason === "Restaurant is not currently accepting online reservations.") {
              throw new Error('NOT_ACCEPTING_RESERVATIONS')
            }
            throw new Error('NO_TABLES_AVAILABLE')
          }
          finalTableIds = [availability.table.id]
        }

        // 3. Create Reservation
        return await tx.reservation.create({
          data: {
            restaurantId,
            guestId: resolvedGuestId,
            partySize,
            reservationDate: toRestaurantDateFilter(reservationDate),
            startTime: absoluteStartTime,
            endTime: absoluteEndTime,
            status: 'CONFIRMED', // default for now
            tables: {
              create: finalTableIds.map((tid: string) => ({
                table: { connect: { id: tid } },
              })),
            },
          },
          include: {
            restaurant: { select: { timezone: true } },
            guest: true,
            tables: {
              include: {
                table: { select: { name: true } },
              },
            },
          }
        })
      }, { isolationLevel: 'Serializable' })

      break; // transaction success, exit retry loop
    } catch (error: any) {
      if (error instanceof Error && (
        error.message === 'SPECIFIC_TABLES_BOOKED' ||
        error.message === 'NO_TABLES_AVAILABLE' ||
        error.message === 'RESTAURANT_CLOSED' ||
        error.message === 'OUTSIDE_OPERATING_HOURS' ||
        error.message === 'NOT_ACCEPTING_RESERVATIONS'
      )) {
        throw error;
      }

      const isSerializationError =
        (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') ||
        (error && typeof error === 'object' && ((error as any).cause?.kind === 'TransactionWriteConflict' || (error as any).cause?.originalCode === '40001')) ||
        (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.toLowerCase().includes('could not serialize access'));

      if (isSerializationError) {
        retries--;
        if (retries === 0) {
          throw new Error('CONCURRENT_BOOKING_FAILED');
        }
        await new Promise(res => setTimeout(res, 20 + Math.random() * 30));
        continue;
      }

      throw error;
    }
  }

  return reservation
}

export async function updateReservation(reservationId: string, data: any) {
  const { status, partySize, startTime, endTime, tableIds, internalNotes, specialRequest } = data

  const updateData: any = {
    status,
    partySize: partySize ? parseInt(partySize) : undefined,
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
    internalNotes,
    specialRequest,
  }

  // Handle table updates (disconnect existing across junction, add new ones)
  if (tableIds && tableIds.length > 0) {
    await prisma.reservationOnTable.deleteMany({
      where: { reservationId },
    })
    updateData.tables = {
      create: tableIds.map((tid: string) => ({
        table: { connect: { id: tid } },
      })),
    }
  }

  return await prisma.reservation.update({
    where: { id: reservationId },
    data: updateData,
  })
}

export async function deleteReservation(reservationId: string) {
  return await prisma.reservation.delete({
    where: { id: reservationId },
  })
}
