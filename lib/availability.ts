import { prisma } from "@/lib/prisma"
import { Prisma } from '../generated/client'
import {
  getTurnTime,
  combineDateAndTime,
  addMinutesToDate,
  timeToMinutes,
  getEffectiveScheduleSlots,
  fitsInSchedule,
  generateAvailableTimeSlots
} from "@/lib/schedule-utils"
import { getRestaurantTodayStr, parseDateStr, toRestaurantUtcDate } from "@/lib/time-utils"

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

  const override = await db.scheduleOverride.findUnique({
    where: { restaurantId_date: { restaurantId, date: reqDate } },
    include: { slots: true },
  })

  const operatingHours = override ? null : await db.operatingHours.findFirst({
    where: { restaurantId, dayOfWeek },
    include: { slots: true },
  })

  const effectiveSlots = getEffectiveScheduleSlots(override, operatingHours)

  if (!effectiveSlots) {
    if (override) {
      return { valid: false, reason: 'RESTAURANT_CLOSED' }
    }
    return { valid: false, reason: 'NO_OPERATING_HOURS' }
  }

  // Verify the requested block fits entirely within at least one continuous slot
  const isValid = fitsInSchedule(time, durationMins, effectiveSlots)

  if (isValid) {
    return { valid: true }
  }

  return { valid: false, reason: 'OUTSIDE_OPERATING_HOURS' }
}

export async function checkAvailability({
  restaurantId,
  date,
  time,
  partySize,
  absoluteStartTime,
  isInternal = false,
}: {
  restaurantId: string
  date: string
  time: string
  partySize: number
  absoluteStartTime?: Date
  isInternal?: boolean
}, tx?: Prisma.TransactionClient) {
  const db = tx || prisma

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { timezone: true, isAcceptingReservations: true },
  })

  if (!restaurant) throw new Error("Restaurant not found")

  if (!isInternal && !restaurant.isAcceptingReservations) {
    return { available: false, reason: "Restaurant is not currently accepting online reservations." }
  }

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
  
  let requestedStart = absoluteStartTime
  if (!requestedStart) {
    requestedStart = toRestaurantUtcDate(date, time, restaurant.timezone)
  }
  
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60000)

  // 4. Fetch Conflicts
  // Add our reset buffer to perfectly separate back-to-back bookings
  // A conflict occurs if the existing reservation starts before we finish cleaning (requestedEnd + buffer)
  // AND the existing reservation finishes cleaning AFTER we want to start (requestedStart - buffer)
  const requestEndWithBuffer = new Date(requestedEnd.getTime() + BUFFER_TIME * 60000)
  const requestStartMinusBuffer = new Date(requestedStart.getTime() - BUFFER_TIME * 60000)

  const activeReservations = await db.reservation.findMany({
    where: {
      restaurantId,
      reservationDate: reqDate,
      status: {
        in: ["PENDING", "CONFIRMED", "WAITLISTED", "ARRIVED", "PARTIALLY_ARRIVED", "SEATED"],
      },
      // Conflict condition: (ExistingStart < RequestedEnd + Buffer) && (ExistingEnd > RequestedStart - Buffer)
      AND: [
        { startTime: { lt: requestEndWithBuffer } },
        { endTime: { gt: requestStartMinusBuffer } },
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

export async function getAvailableSlotsForDate({
  restaurantId,
  date,
  partySize,
  restaurantTimezone,
}: {
  restaurantId: string
  date: string
  partySize: number
  restaurantTimezone: string
}) {
  const reqDate = parseDateStr(date)
  const dayOfWeek = reqDate.getUTCDay()

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { isAcceptingReservations: true },
  })

  if (!restaurant?.isAcceptingReservations) {
    return []
  }

  // 1. Get Effective Schedule
  const override = await prisma.scheduleOverride.findUnique({
    where: { restaurantId_date: { restaurantId, date: reqDate } },
    include: { slots: true },
  })

  const operatingHours = override ? null : await prisma.operatingHours.findFirst({
    where: { restaurantId, dayOfWeek },
    include: { slots: true },
  })

  const effectiveSlots = getEffectiveScheduleSlots(override, operatingHours)
  if (!effectiveSlots || effectiveSlots.length === 0) return []

  // 2. Fetch Suitable Tables
  const suitableTables = await prisma.table.findMany({
    where: {
      diningArea: { restaurantId },
      isActive: true,
      minCapacity: { lte: partySize },
      maxCapacity: { gte: partySize },
    },
    select: { id: true }
  })

  if (suitableTables.length === 0) return []
  const suitableTableIds = suitableTables.map(t => t.id)

  // 3. Fetch Relevant Reservations (only those taking suitable tables)
  const activeReservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      reservationDate: reqDate,
      status: {
        in: ["PENDING", "CONFIRMED", "WAITLISTED", "ARRIVED", "PARTIALLY_ARRIVED", "SEATED"],
      },
      tables: {
        some: { tableId: { in: suitableTableIds } }
      }
    },
    select: {
      startTime: true,
      endTime: true,
      tables: { select: { tableId: true } }
    }
  })

  // 4. Generate Potential Slots
  const durationMins = getTurnTime(partySize)
  const isToday = date === getRestaurantTodayStr(restaurantTimezone)
  const potentialSlots = generateAvailableTimeSlots(effectiveSlots, durationMins, isToday, restaurantTimezone)

  const validSlots: string[] = []

  // 5. Filter slots by actual table availability
  for (const slotTime of potentialSlots) {
    const requestedStart = toRestaurantUtcDate(date, slotTime, restaurantTimezone)
    const requestedEnd = new Date(requestedStart.getTime() + durationMins * 60000)
    
    const requestEndWithBuffer = new Date(requestedEnd.getTime() + BUFFER_TIME * 60000)
    const requestStartMinusBuffer = new Date(requestedStart.getTime() - BUFFER_TIME * 60000)

    const takenTables = new Set<string>()

    for (const res of activeReservations) {
      if (res.startTime < requestEndWithBuffer && res.endTime > requestStartMinusBuffer) {
        for (const t of res.tables) {
          if (suitableTableIds.includes(t.tableId)) {
            takenTables.add(t.tableId)
          }
        }
      }
    }

    if (suitableTableIds.length - takenTables.size > 0) {
      validSlots.push(slotTime)
    }
  }

  return validSlots
}
