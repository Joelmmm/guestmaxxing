import { prisma } from "@/lib/prisma"
import { Prisma } from '../generated/client'
import { 
  getTurnTime, 
  combineDateAndTime, 
  addMinutesToDate,
  timeToMinutes
} from "@/lib/schedule-utils"

const BUFFER_TIME = 10 // minutes for bussing/resetting table

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

  // 1. Calculate Boundaries
  let timeSlots: { openTime: string; closeTime: string }[] = []

  // First, check for Schedule overrides (holidays / closures)
  const override = await db.scheduleOverride.findFirst({
    where: {
      restaurantId,
      date: reqDate,
    },
    include: { slots: true },
  })

  if (override) {
    if (override.isClosed) {
      return { available: false, reason: "Restaurant is closed on this date." }
    }
    timeSlots = override.slots
  } else {
    // If no override, rely on standard Operating Hours
    const operatingHours = await db.operatingHours.findFirst({
      where: {
        restaurantId,
        dayOfWeek,
      },
      include: { slots: true },
    })

    if (!operatingHours || operatingHours.slots.length === 0) {
      return { available: false, reason: "No operating hours found for this day." }
    }
    timeSlots = operatingHours.slots
  }

  // 2. Determine Duration
  const duration = getTurnTime(partySize)
  const requestedStart = absoluteStartTime || combineDateAndTime(date, time)
  const requestedEnd = new Date(requestedStart.getTime() + duration * 60000)

  // 3. Check Shift Limits
  // The reservation start/end must fit entirely within at least one valid continuous time slot.
  const reqStartMins = timeToMinutes(time)
  const reqEndMins = reqStartMins + duration

  let withinShift = false
  for (const slot of timeSlots) {
    const slotStartMins = timeToMinutes(slot.openTime)
    const slotEndMins = timeToMinutes(slot.closeTime)
    
    // Check if the requested block falls entirely within this slot
    if (reqStartMins >= slotStartMins && reqEndMins <= slotEndMins) {
      withinShift = true
      break
    }
  }

  if (!withinShift) {
    return { available: false, reason: "Requested reservation exceeds operating hours or shift closing time." }
  }

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
