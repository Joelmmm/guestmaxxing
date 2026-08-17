import { prisma } from "@/lib/prisma"
import { checkAvailability, checkScheduleValidity } from "@/lib/availability"
import { toRestaurantDateFilter } from "@/lib/time-utils"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { ReservationFormValues } from "@/lib/validations/reservation"
import { upsertGuestForUser } from "@/lib/services/guests"
import { sendReservationConfirmationEmail } from "@/lib/services/email"
import { ReservationStatus } from "@/generated/client"
import type { Prisma } from "@/generated/client"

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "WAITLISTED",
  "ARRIVED",
  "PARTIALLY_ARRIVED",
  "SEATED",
]

function isSerializationError(error: unknown) {
  const errorRecord =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : null
  const causeRecord =
    errorRecord?.cause && typeof errorRecord.cause === "object"
      ? (errorRecord.cause as Record<string, unknown>)
      : null

  return (
    errorRecord?.code === "P2034" ||
    causeRecord?.kind === "TransactionWriteConflict" ||
    causeRecord?.originalCode === "40001" ||
    (typeof errorRecord?.message === "string" &&
      errorRecord.message.toLowerCase().includes("could not serialize access"))
  )
}

async function validateAndCheckSpecificTables(
  tx: Prisma.TransactionClient,
  {
    restaurantId,
    tableIds,
    absoluteStartTime,
    absoluteEndTime,
    excludeReservationId,
  }: {
    restaurantId: string
    tableIds: string[]
    absoluteStartTime: Date
    absoluteEndTime: Date
    excludeReservationId?: string
  }
) {
  const uniqueTableIds = [...new Set(tableIds)]
  const validTableCount = await tx.table.count({
    where: {
      id: { in: uniqueTableIds },
      diningArea: { restaurantId },
    },
  })

  if (validTableCount !== uniqueTableIds.length) {
    throw new Error("SPECIFIC_TABLES_INVALID")
  }

  const overlapping = await tx.reservationOnTable.findFirst({
    where: {
      tableId: { in: uniqueTableIds },
      reservation: {
        ...(excludeReservationId
          ? { id: { not: excludeReservationId } }
          : {}),
        status: { in: ACTIVE_RESERVATION_STATUSES },
        startTime: { lt: absoluteEndTime },
        endTime: { gt: absoluteStartTime },
      },
    },
  })

  if (overlapping) {
    throw new Error("SPECIFIC_TABLES_BOOKED")
  }

  return uniqueTableIds
}

/**
 * Service Layer for Reservations
 * Contains raw business logic that is agnostic to HTTP definitions (Routes) or Next.js specifics.
 */

export async function getReservations(
  restaurantId: string,
  date?: string,
  status?: string
) {
  const where: Prisma.ReservationWhereInput = { restaurantId }

  if (date) {
    where.reservationDate = toRestaurantDateFilter(date)
  }
  if (status) {
    if (
      !Object.values(ReservationStatus).includes(status as ReservationStatus)
    ) {
      throw new Error("INVALID_RESERVATION_STATUS")
    }
    where.status = status as ReservationStatus
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
    orderBy: { startTime: "asc" },
  })
}

export async function createReservation(
  data: ReservationFormValues,
  isInternal: boolean = false,
  userId?: string
) {
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
    select: { timezone: true, name: true },
  })

  if (!restaurant) {
    throw new Error("RESTAURANT_NOT_FOUND")
  }

  const localTimeStr = `${reservationDate} ${startTime}`
  const absoluteStartTime = fromZonedTime(localTimeStr, restaurant.timezone)
  const absoluteEndTime = new Date(
    absoluteStartTime.getTime() + (durationMins || 90) * 60_000
  )

  if (absoluteStartTime < new Date()) {
    throw new Error("PAST_RESERVATION")
  }

  const email = guestData?.email?.trim() || null
  const phone = guestData?.phone?.trim() || null

  // 1. Resolve Guest
  let resolvedGuestId = guestId

  if (resolvedGuestId && !isInternal) {
    if (!userId) {
      throw new Error("GUEST_ACCESS_DENIED")
    }

    const ownedGuest = await prisma.guest.findFirst({
      where: { id: resolvedGuestId, userId },
      select: { id: true },
    })

    if (!ownedGuest) {
      throw new Error("GUEST_ACCESS_DENIED")
    }
  }

  if (!isInternal && tableIds && tableIds.length > 0) {
    throw new Error("TABLE_ASSIGNMENT_FORBIDDEN")
  }

  if (!resolvedGuestId && userId && guestData && email) {
    const res = await upsertGuestForUser({
      userId,
      email,
      firstName: guestData.firstName,
      lastName: guestData.lastName,
      phone: phone || undefined,
    })
    resolvedGuestId = res.guestId
  } else if (!resolvedGuestId && guestData && (email || phone)) {
    // Find or create guest
    const existingGuest = await prisma.guest.findFirst({
      where: {
        OR: [email ? { email } : {}, phone ? { phone } : {}].filter(
          (cond) => Object.keys(cond).length > 0
        ),
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
    throw new Error("GUEST_INFO_REQUIRED")
  }

  // 2 & 3. Transactional validation and creation
  let reservation
  let retries = 3
  while (retries > 0) {
    try {
      reservation = await prisma.$transaction(
        async (tx) => {
          let finalTableIds: string[] = []

          // ── Schedule gate: applies to BOTH manual and automatic paths ──────────
          // Without this, selecting a specific table bypasses override/hours checks.
          const scheduleCheck = await checkScheduleValidity(
            {
              restaurantId,
              date: reservationDate,
              time: startTime,
              durationMins: durationMins || 90,
            },
            tx
          )

          if (!scheduleCheck.valid) {
            if (scheduleCheck.reason === "RESTAURANT_CLOSED")
              throw new Error("RESTAURANT_CLOSED")
            if (scheduleCheck.reason === "NO_OPERATING_HOURS")
              throw new Error("NO_TABLES_AVAILABLE")
            throw new Error("OUTSIDE_OPERATING_HOURS")
          }

          // ────────────────────────────────────────────────────────────────────────

          if (tableIds && tableIds.length > 0) {
            // Specific table assignment (Manual Override)
            finalTableIds = await validateAndCheckSpecificTables(tx, {
              restaurantId,
              tableIds,
              absoluteStartTime,
              absoluteEndTime,
            })
          } else {
            // Dynamic Table Assignment (Standard Booking)
            const requestDate = reservationDate
            const requestTime = startTime

            const availability = await checkAvailability(
              {
                restaurantId,
                date: requestDate,
                time: requestTime,
                partySize,
                absoluteStartTime,
                isInternal,
              },
              tx
            )

            if (!availability.available || !availability.table) {
              if (
                availability.reason ===
                "Restaurant is not currently accepting online reservations."
              ) {
                throw new Error("NOT_ACCEPTING_RESERVATIONS")
              }
              throw new Error("NO_TABLES_AVAILABLE")
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
              status: "CONFIRMED", // default for now
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
            },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )

      break // transaction success, exit retry loop
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message === "SPECIFIC_TABLES_BOOKED" ||
          error.message === "NO_TABLES_AVAILABLE" ||
          error.message === "RESTAURANT_CLOSED" ||
          error.message === "OUTSIDE_OPERATING_HOURS" ||
          error.message === "NOT_ACCEPTING_RESERVATIONS" ||
          error.message === "SPECIFIC_TABLES_INVALID")
      ) {
        throw error
      }

      if (isSerializationError(error)) {
        retries--
        if (retries === 0) {
          throw new Error("CONCURRENT_BOOKING_FAILED")
        }
        await new Promise((res) => setTimeout(res, 20 + Math.random() * 30))
        continue
      }

      throw error
    }
  }

  if (reservation?.guest?.email) {
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      timeZone: restaurant.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(reservation.startTime)

    const formattedTime = new Intl.DateTimeFormat("en-US", {
      timeZone: restaurant.timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(reservation.startTime)

    sendReservationConfirmationEmail(
      reservation.guest.email,
      reservation.guest.firstName,
      restaurant.name,
      formattedDate,
      formattedTime,
      reservation.partySize,
      reservation.id
    ).catch(console.error)
  }

  return reservation
}

export interface UpdateReservationInput {
  status?: ReservationStatus | string
  partySize?: number | string
  reservationDate?: string
  durationMins?: number | string
  startTime?: Date | string
  endTime?: Date | string
  tableIds?: string[]
  internalNotes?: string | null
  specialRequest?: string | null
}

export async function updateReservation(
  reservationId: string,
  data: UpdateReservationInput
) {
  const {
    status,
    partySize,
    reservationDate,
    durationMins,
    startTime,
    endTime,
    tableIds,
    internalNotes,
    specialRequest,
  } = data

  if (
    status &&
    !Object.values(ReservationStatus).includes(status as ReservationStatus)
  ) {
    throw new Error("INVALID_RESERVATION_STATUS")
  }

  let retries = 3
  while (retries > 0) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.reservation.findUnique({
            where: { id: reservationId },
            include: {
              restaurant: { select: { timezone: true } },
              tables: { select: { tableId: true } },
            },
          })

          if (!existing) throw new Error("RESERVATION_NOT_FOUND")

          const hasScheduleChange =
            reservationDate !== undefined ||
            startTime !== undefined ||
            endTime !== undefined ||
            durationMins !== undefined ||
            partySize !== undefined
          const targetStatus = (status ?? existing.status) as ReservationStatus
          const targetPartySize =
            partySize !== undefined ? Number(partySize) : existing.partySize
          const targetDate =
            reservationDate ?? existing.reservationDate.toISOString().slice(0, 10)

          let absoluteStartTime: Date
          if (startTime === undefined && reservationDate !== undefined) {
            const localStartTime = formatInTimeZone(
              existing.startTime,
              existing.restaurant.timezone,
              "HH:mm"
            )
            absoluteStartTime = fromZonedTime(
              `${targetDate} ${localStartTime}`,
              existing.restaurant.timezone
            )
          } else if (
            typeof startTime === "string" &&
            /^\d{2}:\d{2}$/.test(startTime)
          ) {
            absoluteStartTime = fromZonedTime(
              `${targetDate} ${startTime}`,
              existing.restaurant.timezone
            )
          } else {
            absoluteStartTime = startTime
              ? new Date(startTime)
              : existing.startTime
          }

          let absoluteEndTime: Date
          if (
            typeof endTime === "string" &&
            /^\d{2}:\d{2}$/.test(endTime)
          ) {
            absoluteEndTime = fromZonedTime(
              `${targetDate} ${endTime}`,
              existing.restaurant.timezone
            )
          } else if (endTime !== undefined) {
            absoluteEndTime = new Date(endTime)
          } else if (durationMins !== undefined) {
            absoluteEndTime = new Date(
              absoluteStartTime.getTime() + Number(durationMins) * 60_000
            )
          } else if (startTime !== undefined || reservationDate !== undefined) {
            const existingDuration =
              existing.endTime.getTime() - existing.startTime.getTime()
            absoluteEndTime = new Date(
              absoluteStartTime.getTime() + existingDuration
            )
          } else {
            absoluteEndTime = existing.endTime
          }

          if (
            !Number.isFinite(absoluteStartTime.getTime()) ||
            !Number.isFinite(absoluteEndTime.getTime()) ||
            absoluteEndTime <= absoluteStartTime
          ) {
            throw new Error("INVALID_RESERVATION_TIME")
          }

          const updateData: Prisma.ReservationUpdateInput = {
            status: status === undefined ? undefined : targetStatus,
            partySize:
              partySize === undefined ? undefined : targetPartySize,
            reservationDate: hasScheduleChange
              ? toRestaurantDateFilter(targetDate)
              : undefined,
            startTime: hasScheduleChange ? absoluteStartTime : undefined,
            endTime: hasScheduleChange ? absoluteEndTime : undefined,
            internalNotes,
            specialRequest,
          }

          const shouldValidateConflicts =
            targetStatus !== "CANCELLED" &&
            targetStatus !== "COMPLETED" &&
            targetStatus !== "NO_SHOW" &&
            (hasScheduleChange || tableIds !== undefined)

          if (shouldValidateConflicts) {
            const scheduleCheck = await checkScheduleValidity(
              {
                restaurantId: existing.restaurantId,
                date: targetDate,
                time: formatInTimeZone(
                  absoluteStartTime,
                  existing.restaurant.timezone,
                  "HH:mm"
                ),
                durationMins: Math.round(
                  (absoluteEndTime.getTime() - absoluteStartTime.getTime()) /
                    60_000
                ),
              },
              tx
            )

            if (!scheduleCheck.valid) {
              if (scheduleCheck.reason === "RESTAURANT_CLOSED") {
                throw new Error("RESTAURANT_CLOSED")
              }
              if (scheduleCheck.reason === "NO_OPERATING_HOURS") {
                throw new Error("NO_TABLES_AVAILABLE")
              }
              throw new Error("OUTSIDE_OPERATING_HOURS")
            }

            const requestedTableIds =
              tableIds === undefined
                ? existing.tables.map(({ tableId }) => tableId)
                : [...new Set(tableIds)]

            if (requestedTableIds.length > 0) {
              const finalTableIds = await validateAndCheckSpecificTables(tx, {
                restaurantId: existing.restaurantId,
                tableIds: requestedTableIds,
                absoluteStartTime,
                absoluteEndTime,
                excludeReservationId: reservationId,
              })

              if (tableIds !== undefined) {
                await tx.reservationOnTable.deleteMany({
                  where: { reservationId },
                })
                updateData.tables = {
                  create: finalTableIds.map((tableId) => ({
                    table: { connect: { id: tableId } },
                  })),
                }
              }
            } else if (tableIds !== undefined) {
              updateData.tables = { deleteMany: {} }
            }
          }

          return tx.reservation.update({
            where: { id: reservationId },
            data: updateData,
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (error: unknown) {
      if (isSerializationError(error)) {
        retries--
        if (retries === 0) {
          throw new Error("CONCURRENT_BOOKING_FAILED")
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 20 + Math.random() * 30)
        )
        continue
      }

      throw error
    }
  }

  throw new Error("CONCURRENT_BOOKING_FAILED")
}

export async function deleteReservation(reservationId: string) {
  return await prisma.reservation.delete({
    where: { id: reservationId },
  })
}

export async function getGuestReservationsByUserId(userId: string) {
  const guest = await prisma.guest.findUnique({
    where: { userId },
  })

  if (!guest) {
    return []
  }

  return await prisma.reservation.findMany({
    where: { guestId: guest.id },
    include: {
      restaurant: {
        select: { name: true, timezone: true },
      },
      tables: {
        include: {
          table: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  })
}
