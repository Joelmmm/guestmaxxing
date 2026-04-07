# Availability Engine: Design & Architecture

This document outlines the business logic layer for the reservation availability engine. It covers the core algorithm, potential design flaws (blind spots), and a recommended implementation pipeline for determining table availability.

## 1. Core Algorithm Concept

The foundational query for availability is:
> "Find tables with enough capacity that aren't occupied during the requested time range."

While this is mathematically sound, transitioning from "mathematically available" to "operationally viable" requires addressing several key constraints.

## 2. Design Flaws & Blind Spots

### The "Combinable Tables" Fallacy (Physical Reality vs. Database Logic)
- **The Blind Spot:** If a party of 8 searches for a table, and the system finds two empty 4-tops, it might assume it has availability. However, these tables could be on opposite sides of the restaurant.
- **The Fix:** Unless "Table Adjacency" or "Combinations" are explicitly modeled in the database (e.g., Table 12 and 13 can be joined to make an 8-top), the automated engine should only return availability if a **single table** satisfies the `minCapacity <= partySize <= maxCapacity` requirement. Large parties requiring multiple tables should be forced to call the restaurant (mapping to `WALK_IN` or `PHONE` booking sources).

### Yield Management ("Table Tetris")
- **The Misconception:** If a party of 2 searches for a table, and there is both an empty 2-top and an empty 6-top available, a naive algorithm returns the first one it finds.
- **The Fix:** If the system assigns the 6-top to the party of 2, the ability to seat a party of 6 later is lost. The algorithm must include a **sorting rule**: *Sort available tables by capacity ascending*. Always seat the party at the smallest table that can comfortably fit them.

### Flow Control and Pace (Kitchen Capacity)
- **The Blind Spot:** If a restaurant has 20 empty tables at 7:00 PM, a naive logic will allow 20 different parties to book at exactly 7:00 PM.
- **The Reality:** Seating 20 tables at the exact same minute will overwhelm the kitchen and the host stand.
- **The Fix:** Availability isn't just about table space; it's about **Flow (Covers per 15 minutes)**. The system must throttle how many people can physically arrive in a given time block. Constraint: *"Even if tables are empty, do not show 7:00 PM as available if we already have X covers booked between 6:45 and 7:15."*
- **Implementation Note:** For the MVP (v1) of the availability engine, we are strictly sticking to *table constraints* (capacity routing). Flow control and pacing limits are deferred to a later iteration.

### Buffer Times and Shift Bounds
- **The Misconception:** A 90-minute reservation `endTime` means the table is available precisely at minute 91.
- **The Fix:** A **Buffer/Reset Time** (e.g., 10-15 minutes) must be added implicitly to the `endTime` for bussing and resetting the table. Additionally, the `endTime` must be validated against the `TimeSlot` hours. If a shift ends at 3:00 PM, and a party of 4 (requiring 90 mins) tries to book at 2:00 PM, the system must reject it because the `endTime` bleeds past closing time.

### Status Filtering
- **The Rule:** Tables are only "taken" if the conflicting reservation status is `PENDING`, `CONFIRMED`, `WAITLISTED`, `ARRIVED`, `PARTIALLY_ARRIVED`, or `SEATED`. The query must explicitly filter out `CANCELLED`, `NO_SHOW`, and `COMPLETED` when checking for overlaps.

### The Concurrency Race Condition
- **The Blind Spot:** 
  1. User A asks for 7 PM. System checks, finds Table 12, says "Available!"
  2. User B asks for 7 PM. System checks, finds Table 12, says "Available!"
  3. User A clicks "Confirm". Insert into DB.
  4. User B clicks "Confirm". Insert into DB. 
  **Result:** Double-booked table.
- **The Fix:** The creation method must use transactional guarantees. When finalizing the reservation, it must run the availability check *again* directly inside a database transaction right before the `INSERT`.

### The Specific Table Assignment Flaw
- **The Blind Spot:** If the frontend explicitly passes `tableIds` when booking (based on the initial, pre-booking availability check), the backend transaction will lock serialization around *that specific table*.
  1. User A searches for 7 PM, is assigned Table 12.
  2. User B searches for 7 PM, is also assigned Table 12.
  3. User A books Table 12 successfully.
  4. User B's transaction for Table 12 fails due to serialization/conflict.
  **Result:** User B is rejected and asked to try again, even if Table 13 was perfectly empty and viable.
- **The Fix:** Standard web bookings should not pass explicit `tableIds`. Inside the `Serializable` transaction, the backend should rerun `checkAvailability()`, select the *currently* best available table, and dynamically assign it to the new reservation. Explicit `tableIds` should only be validated if sent by a host or admin performing a manual table override.

---

## 3. Recommended Implementation Pipeline

To build a robust availability engine, follow this pipeline for the business logic layer:

1. **Calculate Boundaries:** Fetch `OperatingHours` / `ScheduleOverride` for the requested date. Determine the exact Open/Close time slots.
2. **Determine Duration:** Based on the requested `partySize`, calculate the expected `endTime` (e.g., 2 people = 75 mins, 4 people = 90 mins, 6+ = 120 mins).
3. **Check Shift Limits:** Does `requestedTime + duration` exceed the shift's closing time? If yes, return no availability.
4. **Fetch Conflicts:** Query the database for all `Reservation`s (and their joined `ReservationOnTable` records) that overlap with `[requestedTime, requestedTime + duration + bufferTime]` AND have an active, occupying status.
5. **Filter Tables:** Fetch all `Table`s where `minCapacity <= partySize <= maxCapacity`.
6. **Subtract Conflicts:** Remove the tables found in Step 4 from the tables found in Step 5.
7. **Evaluate:** 
   - If the resulting list is empty: **No Availability**.
   - If the resulting list has tables: Sort them by `maxCapacity` ascending, pick the first one, and return success.
