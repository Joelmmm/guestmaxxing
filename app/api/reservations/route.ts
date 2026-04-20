import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reservationSchema } from '@/lib/validations/reservation'
import { validateBody, verifyRestaurantAccess } from '@/lib/api-utils'
import { checkAvailability } from '@/lib/availability'
import { Prisma } from '../../../generated/client'
import { fromZonedTime } from 'date-fns-tz'
import { toRestaurantDateFilter } from '@/lib/time-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return new NextResponse('Restaurant ID is required', { status: 400 })
    }

    const access = await verifyRestaurantAccess(restaurantId);
    if (!access.isAuthorized) return access.response;

    const date = searchParams.get('date') // YYYY-MM-DD
    const status = searchParams.get('status')

    const where: any = {}

    if (restaurantId) {
      where.restaurantId = restaurantId
    }
    if (date) {
      where.reservationDate = toRestaurantDateFilter(date)
    }
    if (status) {
      where.status = status
    }

    const reservations = await prisma.reservation.findMany({
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

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('[RESERVATIONS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = validateBody(reservationSchema, body)
    if (!validation.isValid) {
      return validation.response
    }

    const {
      restaurantId,
      guestId,
      guestData,
      partySize,
      reservationDate,
      startTime,
      durationMins,
      tableIds,
    } = validation.data

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { timezone: true }
    })

    if (!restaurant) {
      return new NextResponse('Restaurant not found', { status: 404 })
    }

    const localTimeStr = `${reservationDate} ${startTime}`
    const absoluteStartTime = fromZonedTime(localTimeStr, restaurant.timezone)
    const absoluteEndTime = new Date(absoluteStartTime.getTime() + (durationMins || 90) * 60_000)

    if (absoluteStartTime < new Date()) {
      return new NextResponse('Cannot make a reservation in the past', { status: 400 })
    }

    // Normalize guest email and phone to null if empty strings
    // This is CRITICAL because Postgres allows multiple NULLs in a unique index, but NOT multiple empty strings.
    if (guestData) {
      if (!guestData.email?.trim()) guestData.email = undefined;
      if (!guestData.phone?.trim()) guestData.phone = undefined;
    }

    // 1. Resolve Guest
    let resolvedGuestId = guestId

    if (!resolvedGuestId && guestData && (guestData.email || guestData.phone)) {
      // Find or create guest
      const existingGuest = await prisma.guest.findFirst({
        where: {
          OR: [
            guestData.email ? { email: guestData.email } : {},
            guestData.phone ? { phone: guestData.phone } : {},
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
            email: guestData.email,
            phone: guestData.phone,
          },
        })
        resolvedGuestId = newGuest.id
      }
    }

    if (!resolvedGuestId && guestData) {
      // Create guest even without unique identifiers (simplified for walk-ins)
      const newGuest = await prisma.guest.create({
        data: {
          firstName: guestData.firstName,
          lastName: guestData.lastName,
          email: guestData.email,
          phone: guestData.phone,
        },
      })
      resolvedGuestId = newGuest.id
    }

    if (!resolvedGuestId) {
      return new NextResponse('Guest information is required', { status: 400 })
    }

    // 2 & 3. Transactional validation and creation
    let reservation;
    let retries = 3;
    while (retries > 0) {
      try {
        reservation = await prisma.$transaction(async (tx) => {
          let finalTableIds: string[] = []

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
            }, tx)

            if (!availability.available || !availability.table) {
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
          })
        }, { isolationLevel: 'Serializable' })

        break; // transaction success, exit retry loop
      } catch (error: any) {
        if (error instanceof Error && (error.message === 'SPECIFIC_TABLES_BOOKED' || error.message === 'NO_TABLES_AVAILABLE')) {
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
          // Small backoff before retry (20-50ms)
          await new Promise(res => setTimeout(res, 20 + Math.random() * 30));
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(reservation)
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message === 'SPECIFIC_TABLES_BOOKED') {
        return new NextResponse('One or more specific tables are already booked for this time slot.', { status: 409 })
      }
      if (error.message === 'NO_TABLES_AVAILABLE') {
        return new NextResponse('No tables available for this party size at the requested time.', { status: 409 })
      }
      if (error.message === 'CONCURRENT_BOOKING_FAILED') {
        return new NextResponse('Transaction failed due to a concurrent booking. Please try again.', { status: 409 })
      }
    }

    console.error('[RESERVATIONS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
