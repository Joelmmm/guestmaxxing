/**
 * lib/time-utils.ts
 *
 * Centralised time utilities enforcing the Wall-Clock Intent architecture
 * documented in docs/time-handling.md.
 *
 * Rules:
 *  - NEVER use `new Date()` to derive a business-local date.
 *  - ALWAYS pass `timezone` (restaurant.timezone) explicitly.
 *  - Backend: use `toRestaurantUtcDate` to convert wall-clock strings → UTC.
 *  - Frontend: use `formatRestaurantTime` to project UTC → display string.
 */

import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay } from 'date-fns'

// ---------------------------------------------------------------------------
// Shared (server + client)
// ---------------------------------------------------------------------------

/**
 * Returns today's date as a "YYYY-MM-DD" string expressed in the restaurant's
 * timezone, NOT the server/browser locale.
 *
 * @example
 *   getRestaurantTodayStr("America/Santiago") // "2026-04-07" even at midnight UTC
 */
export function getRestaurantTodayStr(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
}

/**
 * Parses a "YYYY-MM-DD" wall-clock date string and returns the corresponding
 * UTC midnight Date that Prisma expects for `@db.Date` columns, anchored to
 * UTC (not local time) to avoid off-by-one days.
 *
 * Use this instead of `new Date(dateStr)` which is locale-dependent.
 */
export function parseDateStr(dateStr: string): Date {
  // Appending T00:00:00.000Z forces UTC interpretation regardless of host locale.
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * Converts a wall-clock date + time (raw strings from the frontend) into an
 * absolute UTC Date using the restaurant's configured timezone.
 *
 * @param dateStr  "YYYY-MM-DD"  (wall-clock date at the restaurant)
 * @param timeStr  "HH:mm"       (wall-clock time at the restaurant)
 * @param timezone IANA tz name  (e.g. "America/New_York")
 */
export function toRestaurantUtcDate(dateStr: string, timeStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone)
}

/**
 * Formats a UTC database date into a localised display string expressed in
 * the restaurant's timezone — bypassing the browser/server locale entirely.
 *
 * @example
 *   formatRestaurantTime(reservation.startTime, "America/Santiago", "HH:mm")
 *   // "11:30"
 */
export function formatRestaurantTime(
  utcDate: Date | string,
  timezone: string,
  formatStr: string
): string {
  return formatInTimeZone(utcDate, timezone, formatStr)
}

// ---------------------------------------------------------------------------
// Server-only helpers (use only in API routes / RSC)
// ---------------------------------------------------------------------------

/**
 * Returns the UTC start-of-day and end-of-day boundaries for "today" in the
 * restaurant's timezone. Used to query Prisma `@db.Date` columns correctly.
 *
 * Because `reservationDate` is stored as `@db.Date` (a UTC date-only column),
 * we compute the restaurant's local date string and create an exact UTC
 * midnight anchor — no `startOfDay(new Date())` which would use the server TZ.
 */
export function getRestaurantDayBounds(timezone: string): { start: Date; end: Date } {
  const todayStr = getRestaurantTodayStr(timezone)
  const utcAnchor = parseDateStr(todayStr)
  // Use date-fns startOfDay / endOfDay on the already-correct UTC anchor.
  return { start: startOfDay(utcAnchor), end: endOfDay(utcAnchor) }
}

/**
 * Converts a "YYYY-MM-DD" date string to the UTC Date that represents the
 * same calendar day in the restaurant's timezone, for use in Prisma queries.
 *
 * Specifically handles the Postgres `@db.Date` field which expects a UTC Date
 * where the date portion (YYYY-MM-DD) is correct in UTC.
 */
export function toRestaurantDateFilter(dateStr: string): Date {
  return parseDateStr(dateStr)
}

// ---------------------------------------------------------------------------
// Client-side display helpers (safe for "use client" components)
// ---------------------------------------------------------------------------

/**
 * Parses a "YYYY-MM-DD" string into a local Date object anchored at noon UTC
 * so that timezone drift (±12 h) never shifts the displayed calendar day.
 * Intended ONLY for calendar component props (`selected`, display rendering).
 *
 * Do NOT use this for business-logic computations — it is purely presentational.
 */
export function parseDateForCalendar(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`)
}

/**
 * Returns a Date representing the start of today in the restaurant's timezone,
 * projected into the local JS Date space for calendar `disabled` predicates.
 *
 * This cannot be a true "wall-clock" comparison client-side (the browser has no
 * tz database lookup), but anchoring to the restaurant's local date string via
 * UTC noon eliminates day-boundary off-by-ones that plague `new Date()`.
 */
export function getRestaurantTodayForCalendar(timezone: string): Date {
  const todayStr = getRestaurantTodayStr(timezone)
  return parseDateForCalendar(todayStr)
}
