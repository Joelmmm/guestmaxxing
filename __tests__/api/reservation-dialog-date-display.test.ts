import { describe, test, expect } from "vitest";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

// ---------------------------------------------------------------------------
// Helpers that mirror the exact logic used in reservation-dialog.tsx
// ---------------------------------------------------------------------------

/**
 * Derives the `reservationDate` form default from the reservation record.
 *
 * CORRECT approach: reservationDate is stored as midnight UTC for the intended
 * calendar date (e.g. "2026-04-08T00:00:00.000Z" means the 8th).
 * We extract the date by slicing at 'T', which is timezone-agnostic and always
 * yields the intended calendar date regardless of the restaurant's timezone.
 *
 * WRONG approach: formatInTimeZone(reservationDate, tz, "yyyy-MM-dd")
 * — this shifts midnight UTC into the restaurant's local clock, producing
 * the *previous* day for any timezone behind UTC.
 */
function deriveReservationDateDefault(reservationDate: string | Date): string {
  const iso =
    typeof reservationDate === "string"
      ? reservationDate
      : reservationDate.toISOString();
  return iso.split("T")[0]; // e.g. "2026-04-08"
}

/**
 * Renders a yyyy-MM-dd string as a human-readable date for the Calendar button.
 *
 * CORRECT approach: parse at local noon (T12:00:00, no Z suffix) so that
 * date-fns renders in the LOCAL calendar, not UTC calendar.
 *
 * WRONG approach: format(field.value, "PPP")
 * — date-fns coerces a bare date string to midnight UTC, which in any timezone
 * behind UTC renders the previous calendar day.
 */
function renderDateButtonLabel(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00`), "PPP");
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Reservation Dialog - date display (Wall-Clock Intent, Phase 3)", () => {

  // -------------------------------------------------------------------------
  // deriveReservationDateDefault — the form field default value
  // -------------------------------------------------------------------------
  describe("deriveReservationDateDefault", () => {

    test("extracts calendar date from midnight-UTC ISO string without shifting", () => {
      // April 8 stored as midnight UTC — should always read back as '2026-04-08'
      expect(deriveReservationDateDefault("2026-04-08T00:00:00.000Z")).toBe("2026-04-08");
    });

    test("is unaffected by restaurant timezone offset (America/New_York UTC-4)", () => {
      // Regression: formatInTimeZone("2026-04-08T00:00:00.000Z", "America/New_York", "yyyy-MM-dd")
      // returns "2026-04-07" because midnight UTC = 8 PM EDT previous day.
      const bugged = formatInTimeZone(
        "2026-04-08T00:00:00.000Z",
        "America/New_York",
        "yyyy-MM-dd"
      );
      expect(bugged).toBe("2026-04-07"); // demonstrates the bug we are NOT using

      // Correct implementation is immune to the timezone offset
      expect(deriveReservationDateDefault("2026-04-08T00:00:00.000Z")).toBe("2026-04-08");
    });

    test("is unaffected by restaurant timezone offset (America/Santiago UTC-3)", () => {
      const bugged = formatInTimeZone(
        "2026-04-08T00:00:00.000Z",
        "America/Santiago",
        "yyyy-MM-dd"
      );
      expect(bugged).toBe("2026-04-07"); // same off-by-one bug

      expect(deriveReservationDateDefault("2026-04-08T00:00:00.000Z")).toBe("2026-04-08");
    });

    test("is unaffected by large positive offset (Asia/Tokyo UTC+9)", () => {
      // UTC+9 is ahead, so midnight UTC is already 9 AM Tokyo → same date
      const tokyoResult = formatInTimeZone(
        "2026-04-08T00:00:00.000Z",
        "Asia/Tokyo",
        "yyyy-MM-dd"
      );
      expect(tokyoResult).toBe("2026-04-08"); // no bug here, but confirm our impl matches
      expect(deriveReservationDateDefault("2026-04-08T00:00:00.000Z")).toBe("2026-04-08");
    });

    test("also accepts a Date object (from JSON.parse hydration)", () => {
      expect(deriveReservationDateDefault(new Date("2026-04-08T00:00:00.000Z"))).toBe(
        "2026-04-08"
      );
    });
  });

  // -------------------------------------------------------------------------
  // renderDateButtonLabel — Calendar trigger label
  // -------------------------------------------------------------------------
  describe("renderDateButtonLabel", () => {

    test("renders 'April 8th, 2026' for date string '2026-04-08'", () => {
      expect(renderDateButtonLabel("2026-04-08")).toBe("April 8th, 2026");
    });

    test("regression: bare date string parsed without noon anchor shifts to previous day", () => {
      // date-fns treats "2026-04-08" as midnight UTC.
      // In any UTC-N timezone the local JS Date object falls on April 7.
      // We cannot assert a specific wrong date here (it's machine-timezone-
      // dependent) but we CAN assert our safe implementation is always right.
      const safe = renderDateButtonLabel("2026-04-08");
      expect(safe).toBe("April 8th, 2026");
    });

    test("renders 'April 7th, 2026' for date string '2026-04-07'", () => {
      expect(renderDateButtonLabel("2026-04-07")).toBe("April 7th, 2026");
    });
  });

  // -------------------------------------------------------------------------
  // startTime display — must use formatInTimeZone (not new Date)
  // -------------------------------------------------------------------------
  describe("startTime display via formatInTimeZone", () => {

    test("projects UTC startTime into restaurant timezone correctly (America/New_York)", () => {
      // DB stores: 2026-04-08T19:30:00.000Z
      // Restaurant TZ: America/New_York (EDT = UTC-4)
      // Expected wall-clock: 15:30
      const result = formatInTimeZone(
        "2026-04-08T19:30:00.000Z",
        "America/New_York",
        "HH:mm"
      );
      expect(result).toBe("15:30");
    });

    test("regression: new Date(startTime) would display in browser timezone, not restaurant TZ", () => {
      // We can't replicate the bug deterministically (depends on process TZ),
      // but we can confirm the correct path always produces the right result.
      const utcStartTime = "2026-04-08T19:30:00.000Z";
      const restaurantTz = "America/New_York";
      expect(formatInTimeZone(utcStartTime, restaurantTz, "HH:mm")).toBe("15:30");
    });

    test("projects UTC startTime into restaurant timezone correctly (America/Santiago, UTC-4 in April)", () => {
      // 2026-04-08T19:30:00.000Z in Santiago in April (CLT = UTC-4, DST ended March) = 15:30
      const result = formatInTimeZone(
        "2026-04-08T19:30:00.000Z",
        "America/Santiago",
        "yyyy-MM-dd HH:mm"
      );
      expect(result).toBe("2026-04-08 15:30");
    });
  });
});
