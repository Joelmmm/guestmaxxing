/**
 * Utilities for handling restaurant scheduling math.
 * All calculations are based on minutes from midnight (0 to 1439).
 */

import { formatInTimeZone } from "date-fns-tz"

export const MINUTES_IN_DAY = 1440
export const SLOT_INCREMENT = 15 // Snap to 15-minute increments

/**
 * Converts "HH:mm" time string to total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Converts minutes since midnight to an "HH:mm" time string.
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(MINUTES_IN_DAY - 1, totalMinutes))
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

/**
 * Snaps a given time in minutes to the nearest increment (default 15m).
 */
export function snapToIncrement(minutes: number, increment = SLOT_INCREMENT): number {
  return Math.round(minutes / increment) * increment
}

/**
 * Calculates a CSS top/height percentage based on a time string.
 */
export function calculateSlotPosition(openTime: string, closeTime: string): { top: string; height: string } {
  const start = timeToMinutes(openTime)
  const end = timeToMinutes(closeTime)
  
  const top = (start / MINUTES_IN_DAY) * 100
  const height = ((end - start) / MINUTES_IN_DAY) * 100
  
  return {
    top: `${top}%`,
    height: `${height}%`,
  }
}

/**
 * Converts a relative Y position (0..1) to an HH:mm time string.
 */
export function positionToTime(y: number): string {
  const rawMinutes = y * MINUTES_IN_DAY
  const snappedMinutes = snapToIncrement(rawMinutes)
  return minutesToTime(snappedMinutes)
}

/**
 * Checks if a new shift overlaps with existing ones for a given day.
 */
export function hasOverlap(newOpen: string, newClose: string, existingSlots: { openTime: string; closeTime: string }[]): boolean {
  const start = timeToMinutes(newOpen)
  const end = timeToMinutes(newClose)
  
  return existingSlots.some(slot => {
    const sStart = timeToMinutes(slot.openTime)
    const sEnd = timeToMinutes(slot.closeTime)
    // (StartA < EndB) && (EndA > StartB)
  })
}

/**
 * Calculates how long a party will occupy a table based on party size.
 * @param partySize Number of guests
 * @returns Duration in minutes
 */
export function getTurnTime(partySize: number): number {
  if (partySize <= 2) return 75
  if (partySize <= 4) return 90
  if (partySize <= 6) return 120
  return 150 // Large parties 7+
}

/**
 * Parses "YYYY-MM-DD" and "HH:mm" into a UTC Date object
 * assuming the strings already represent local time in the restaurant's timezone.
 * Prisma requires Date objects for queries.
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00.000Z`)
}

/**
 * Adds minutes to an existing JS Date
 */
export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

/**
 * Returns the effective time slots for a day, given an optional override and operating hours.
 * Returns null if the restaurant is explicitly closed or has no operating hours.
 */
export function getEffectiveScheduleSlots(
  override: { isClosed: boolean; slots: { openTime: string; closeTime: string }[] } | null | undefined,
  operatingHours: { slots: { openTime: string; closeTime: string }[] } | null | undefined
): { openTime: string; closeTime: string }[] | null {
  if (override) {
    if (override.isClosed || !override.slots || override.slots.length === 0) {
      return null
    }
    return override.slots
  }

  if (!operatingHours || !operatingHours.slots || operatingHours.slots.length === 0) {
    return null
  }

  return operatingHours.slots
}

/**
 * Validates if a requested time block fits entirely within any of the provided schedule slots.
 */
export function fitsInSchedule(
  time: string,
  durationMins: number,
  slots: { openTime: string; closeTime: string }[]
): boolean {
  const reqStartMins = timeToMinutes(time)
  const reqEndMins = reqStartMins + durationMins

  for (const slot of slots) {
    const slotStartMins = timeToMinutes(slot.openTime)
    const slotEndMins = timeToMinutes(slot.closeTime)
    if (reqStartMins >= slotStartMins && reqEndMins <= slotEndMins) {
      return true
    }
  }

  return false
}

/**
 * Generates an array of "HH:mm" strings representing available start times,
 * in 30-minute increments, ensuring the entire duration fits within the slots.
 */
export function generateAvailableTimeSlots(
  slots: { openTime: string; closeTime: string }[],
  durationMins: number,
  isToday: boolean,
  restaurantTimezone: string
): string[] {
  const result: string[] = []
  
  // Compute the current minute-of-day in the restaurant's timezone
  let currentMinutes = -1
  if (isToday) {
    const nowInRestaurant = formatInTimeZone(new Date(), restaurantTimezone, "HH:mm")
    const [nh, nm] = nowInRestaurant.split(":").map(Number)
    currentMinutes = nh * 60 + nm
  }

  for (const slot of slots) {
    const ohMins = timeToMinutes(slot.openTime)
    const chMins = timeToMinutes(slot.closeTime)
    
    // Start at the opening time of the slot
    let currentStartMins = ohMins
    
    // We only allow slots that can fit the ENTIRE duration
    while (currentStartMins + durationMins <= chMins) {
      if (!isToday || currentStartMins > currentMinutes) {
        result.push(minutesToTime(currentStartMins))
      }
      currentStartMins += 30 // Increment by 30 mins
    }
  }
  
  return result
}
