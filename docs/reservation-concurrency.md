# Reservation Concurrency & Dynamic Table Assignment

## Overview

When preventing double-bookings and race conditions, the simple approach is a transaction wrapper around an upfront overlap check. However, in our system architecture, this introduced an immediate "false rejection" flaw logic for incoming web reservations because they explicitly passed `tableIds` directly from a previous frontend availability check.

If multiple users submitted bookings at perfectly overlapping milliseconds, the traditional model would correctly serialize them. However, since the second user was explicitly "requesting" a table that User 1 just took, the system would aggressively reject User 2 with a 409 Conflict flag—**completely ignoring that other suitable tables were still perfectly available.**

## The Solution: Late-Stage Dynamic Table Assignment

Instead of requiring the frontend to pass explicitly assigned `tableIds` when placing a booking on the general availability page, the reservation engine executes a final **availability-assignment check securely *inside* the booking transaction wrapper.** 

Here's how the implementation works:

1. **Schema Refactor**: `tableIds` in the reservation data validator was updated to allow an empty array. We no longer explicitly require front-facing public pages to define specific tables.
2. **Transaction Integration**: The existing `checkAvailability` function logic (`lib/availability.ts`) was expanded to accept a `PrismaTransactionClient (tx)`. Now, the database lookups for tables, schedules, overrides, and conflicts are all fully evaluated within the current, locked transaction state.
3. **The Creation Sequence**:
   - The entire overlapping check and reservation table insert was moved under a `Serializable` isolation transaction level within `route.ts`. 
   - When the user executes a `POST` carrying an empty `tableIds` property, the backend relies on internal `checkAvailability` logic using the `tx` db client, picking `availability.table.id` exactly before the database `insert` runs. This gracefully routes User 2 to the *next* correctly fitting table rather than crashing. 
   - *Manual Overrides*: If a reservation explicitly requires specific table IDs (such as an Admin or Host using a physical floor plan to forcefully drag-and-drop), the system explicitly checks the array of IDs inside the transaction and will predictably crash overlapping submissions.
4. **Resiliency**: For extreme edge-case collision overlap detected by PostgreSQL, the updated `catch()` blocks actively translate Prisma's `P2034` serializable isolation codes out to standard 409 Conflicts.

## File Breakdown

- **`lib/validations/reservation.ts`**: `.default([])` on `tableIds`.
- **`lib/availability.ts`**: Implements `db = tx || prisma` internal variable matching logic.
- **`app/api/reservations/route.ts`**: Replaces simple `findFirst` checks with layered `prisma.$transaction` functionality targeting dynamic assignments first.
