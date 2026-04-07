/**
 * Utilities for handling restaurant scheduling math.
 * All calculations are based on minutes from midnight (0 to 1439).
 */

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

