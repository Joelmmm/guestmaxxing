import { prisma } from "@/lib/prisma"
import { Prisma } from '../generated/client'
import {
  getTurnTime,
  combineDateAndTime,
  addMinutesToDate,
  timeToMinutes
} from "@/lib/schedule-utils"

const BUFFER_TIME = 10 // minutes for bussing/resetting table

/**
 * Validates whether a given date + time range is permitted by the restaurant's
 * schedule — checking overrides first, then falling back to regular operating hours.
 *
 * Intentionally decoupled from table availability so it can be called on BOTH
 * the dynamic assignment path AND the manual table-assignment path in
 * createReservation, preventing overrides from being silently bypassed.
 */
export async function checkScheduleValidity({
  restaurantId,
  date,
  time,
  durationMins,
}: {
  restaurantId: string
  date: string       // YYYY-MM-DD local restaurant date
  time: string       // HH:mm local restaurant time
  durationMins: number
}, tx?: Prisma.TransactionClient): Promise<{ valid: boolean; reason?: string }> {
  const db = tx || prisma
  const reqDate = new Date(`${date}T00:00:00.000Z`)
  const dayOfWeek = reqDate.getUTCDay()

  let timeSlots: { openTime: string; closeTime: string }[] = []

  // Check for schedule overrides first (holidays / emergency closures).
  // Uses findUnique — @@unique([restaurantId, date]) guarantees at most one row.
  const override = await db.scheduleOverride.findUnique({
    where: { restaurantId_date: { restaurantId, date: reqDate } },
    include: { slots: true },
  })

  if (override) {
    if (override.isClosed) {
      return { valid: false, reason: 'RESTAURANT_CLOSED' }
    }
    // Override exists and restaurant is open, but no slots configured → closed
    if (!override.slots || override.slots.length === 0) {
      return { valid: false, reason: 'RESTAURANT_CLOSED' }
    }
    timeSlots = override.slots
  } else {
    const operatingHours = await db.operatingHours.findFirst({
      where: { restaurantId, dayOfWeek },
      include: { slots: true },
    })

    if (!operatingHours || operatingHours.slots.length === 0) {
      return { valid: false, reason: 'NO_OPERATING_HOURS' }
    }
    timeSlots = operatingHours.slots
  }

  // Verify the requested block fits entirely within at least one continuous slot
  const reqStartMins = timeToMinutes(time)
  const reqEndMins = reqStartMins + durationMins

  for (const slot of timeSlots) {
    const slotStartMins = timeToMinutes(slot.openTime)
    const slotEndMins = timeToMinutes(slot.closeTime)
    if (reqStartMins >= slotStartMins && reqEndMins <= slotEndMins) {
      return { valid: true }
    }
  }

  return { valid: false, reason: 'OUTSIDE_OPERATING_HOURS' }
}

export async function checkAvailability({
  restaurantId,
  date,
  time,
  partySize,
  absoluteStartTime,
}: {
  restaurantId: string
  date: string
  time: string
  partySize: number
  absoluteStartTime?: Date
}, tx?: Prisma.TransactionClient) {
  const db = tx || prisma
  // We use UTC date strings in the DB to strictly represent the calendar day regardless of server timezone.
  const reqDate = new Date(`${date}T00:00:00.000Z`)
  const dayOfWeek = reqDate.getUTCDay()

  // 1 & 3. Validate schedule (overrides + operating hours + shift fit)
  const scheduleCheck = await checkScheduleValidity({
    restaurantId,
    date,
    time,
    durationMins: getTurnTime(partySize),
  }, tx)

  if (!scheduleCheck.valid) {
    const reason =
      scheduleCheck.reason === 'RESTAURANT_CLOSED'
        ? 'Restaurant is closed on this date.'
        : scheduleCheck.reason === 'NO_OPERATING_HOURS'
          ? 'No operating hours found for this day.'
          : 'Requested reservation exceeds operating hours or shift closing time.'
    return { available: false, reason }
  }

  // 2. Determine Duration
  const duration = getTurnTime(partySize)
  const requestedStart = absoluteStartTime || combineDateAndTime(date, time)
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60000)

  // 4. Fetch Conflicts
  // Add our reset buffer to perfectly separate back-to-back bookings
  const conflictEndTime = new Date(requestedEnd.getTime() + BUFFER_TIME * 60000)

  const activeReservations = await db.reservation.findMany({
    where: {
      restaurantId,
      reservationDate: reqDate,
      status: {
        in: ["PENDING", "CONFIRMED", "WAITLISTED", "ARRIVED", "PARTIALLY_ARRIVED", "SEATED"],
      },
      // Conflict condition: (ExistingStart < RequestedEnd + Buffer) && (ExistingEnd > RequestedStart)
      AND: [
        { startTime: { lt: conflictEndTime } },
        { endTime: { gt: requestedStart } },
      ],
    },
    select: {
      id: true,
      tables: {
        select: { tableId: true },
      },
    },
  })

  const takenTableIds = new Set<string>()
  for (const res of activeReservations) {
    for (const t of res.tables) {
      takenTableIds.add(t.tableId)
    }
  }

  // 5. Filter Tables by Capacity
  const availableTables = await db.table.findMany({
    where: {
      diningArea: {
        restaurantId,
      },
      isActive: true,
      minCapacity: { lte: partySize },
      maxCapacity: { gte: partySize },
    },
    orderBy: {
      maxCapacity: "asc", // Yield Management: prefer smaller suitable tables
    },
  })

  // 6. Subtract Conflicts from Mathematically Suitable Tables
  const viableTables = availableTables.filter((t) => !takenTableIds.has(t.id))

  // 7. Evaluate Output
  if (viableTables.length === 0) {
    return { available: false, reason: "No tables available for this party size at the requested time." }
  }

  // Because of the 'asc' order placed in prisma query, the first item is the most optimal fit.
  return {
    available: true,
    viableTables, // Optionally return the array for frontend selection grids
    table: viableTables[0]
  }
}
