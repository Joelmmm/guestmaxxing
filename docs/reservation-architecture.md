# Reservation Status Management & UI Architecture

This document outlines the design system principles and architectural guidelines for handling reservation statuses within the **Reserva** application. It specifically addresses the tension between **System Truth** (the database state dictated by the clock) and **Operational Truth** (what is actually happening on the restaurant floor).

## Architecture Context

In our stack (Next.js 15+, Prisma, Server Actions), all mutations happen via `app/actions/reservations.ts` calling into `lib/services/reservations.ts`. Our Prisma `schema.prisma` defines strict `ReservationStatus` enums (`PENDING`, `CONFIRMED`, `SEATED`, `COMPLETED`, etc.). 

Because the UI receives data statically from the server and updates it via Server Actions, we must carefully separate **hard database mutations** from **derived UI states** in components like `reservations-list.tsx`.

## Core Principle: Avoid Hard Automation on the Floor

For live restaurant operations, you should **almost never auto-mutate the source-of-truth status in the database** to terminal states (like `COMPLETED` or `NO_SHOW`) based purely on time intervals. 

* **The "Running Behind" Scenario:** If the restaurant is slammed and a guest is seated 20 minutes late, but a background job auto-marked them as `NO_SHOW`, the host is forced to undo system actions while busy.
* **The "Lingering Guest" Scenario:** If a table is auto-marked `COMPLETED` at their calculated `endTime` (+90 mins), the system might signal to the host that the `Table` is ready for the next walk-in, leading to double-bookings if the guest is still occupying it.

Instead, the frontend relies on **Derived UI States** and **Smart Grouping** to alert the host, keeping the human in control.

---

## 1. Smart Grouping (Data Transformation)

Instead of passing a flat, chronologically sorted `Reservations[]` array directly into the `Table` component in `reservations-list.tsx`, the frontend applies a transformation to group reservations based on operational relevance. 

### Recommended Grouping Hierarchy
1. **Action Required (Sticky at the top):**
   * *Late/Overdue:* `startTime` has passed by > 15 mins (using `restaurant.timezone`), and status is still `CONFIRMED` or `PENDING`.
   * *Overstayed:* Status is `SEATED` but `endTime` has passed.
2. **Active Floor:**
   * Guests currently marked as `ARRIVED` or `SEATED`.
3. **Upcoming:**
   * `CONFIRMED` and `PENDING` guests whose `startTime` is in the future.
4. **Completed / Inactive (Visually dimmed):**
   * Reservations marked as `COMPLETED`, `CANCELLED`, or `NO_SHOW`.

---

## 2. Contextual Badges (UI Layer)

Contextual badges act as the visual differentiator that consumes the categorized data. They use the gap between "Wall-Clock Time" and the `Reservation.startTime` to conditionally render UI elements without invoking a Next.js Server Action to alter the database.

* **The "Late" Warning:** If `status === 'CONFIRMED'` and `currentTime > startTime + 15 mins`, the UI swaps the standard badge for a high-priority warning (e.g., a `destructive` "Late - 15m" badge).
* **The "Overstay" Warning:** If `status === 'SEATED'` and `currentTime > endTime`, the row or badge subtly changes to indicate "Overstayed", warning the host that the next party might be waiting.
* **Visual Dimming:** Terminal statuses (`COMPLETED`, `CANCELLED`) should apply an `opacity-50 grayscale` class to the `TableRow` so they don't clutter the active floor view.

---

## 3. Soft Automation (The Night Audit)

*Note: This is an opt-in feature, vital for long-term analytics accuracy, but should be separated from live dashboard operations.*

To ensure historical data and analytics (like actual table turn times and no-show rates) are accurate, the system can employ a "Night Audit" cron job (e.g., using Inngest or Trigger.dev).

* **When:** Runs at 3:00 AM local restaurant time (mapped via `Restaurant.timezone`).
* **What:** 
  * Sweeps all `CONFIRMED` or `PENDING` reservations from the previous calendar day and mutates them to `NO_SHOW`.
  * Sweeps all `SEATED` reservations from the previous day and mutates them to `COMPLETED`.
* **Why:** This cleans the Prisma database post-operations without ever interfering with the live host stand during service.
