# Time Handling Architecture

## Overview
Scheduling applications spanning across multiple physical locations (e.g., booking a restaurant or flight) present a unique challenge: managing time accurately across varying user timezones and physical business locations. 

The native JavaScript `Date` API defaults to the user's local operating system timezone. Relying on this leads to critical errors, such as a user in California mistakenly booking a table for 3:30 PM in New York when they intended to book for 11:30 AM.

To prevent timezone corruption, this application enforces a strict **"Wall-Clock Intent"** architecture, creating an absolute "Source of Truth" firmly tied to the Business.

---

## Core Principles

### 1. Wall-Clock Intent vs. Absolute Time
When a user selects "11:30" from a dropdown, they are declaring **Wall-Clock Intent** ("I intend to arrive when the clock on the wall at the restaurant reads 11:30"). They are *not* declaring an absolute UTC moment in time.

The API contract must separate this intent from the absolute time storage required by the database.

### 2. Never Trust the Client
The frontend should never attempt to guess UTC timestamps using the `Date` object or `.toISOString()`. The client's timezone is irrelevant to the business transaction. The frontend is responsible strictly for passing raw strings.

### 3. The Backend is the Source of Truth
The backend exclusively resolves Wall-Clock Intent into UTC based on the business entity's configured timezone (e.g., `restaurant.timezone` being `"America/New_York"`). 

---

## Architectural Implementation

### Phase 1: The API Payload Contract
The frontend transmits primitive string formats without any inherent timezone bias.

**Correct payload structure:**
```json
{
  "restaurantId": "clt9xyzy...",
  "reservationDate": "2026-04-08",
  "startTime": "11:30"
}
```

*Anti-pattern:* Setting `startTime` to `"2026-04-08T15:30:00.000Z"` on the client-side. This obscures intent and forces the backend to mathematically undo the client's timezone math.

### Phase 2: Resolving to UTC on the Backend
The database expects a perfectly isolated point in time (UTC) to guarantee chronologic integrity.
When receiving the primitive strings, the backend:
1. Queries the business identity (Restaurant) to determine its defining `timezone`.
2. Utilizes a strict timezone resolving library (`date-fns-tz` or `luxon`).
3. Computes the absolute UTC time and persists this to the Prisma ORM.

```typescript
import { fromZonedTime } from 'date-fns-tz'

// 1. Fetch Restaurant Timezone from DB
const restaurant = await prisma.restaurant.findUnique({ where: { id } })
// e.g. restaurant.timezone === "America/Santiago"

// 2. Synthesize a naive datetime string
const localTimeStr = `${payload.reservationDate} ${payload.startTime}`

// 3. Resolve the date mathematically using the restaurant's TZ
const absoluteUTC = fromZonedTime(localTimeStr, restaurant.timezone)

// 4. Safely Save in standard UTC
await prisma.reservation.create({
  data: {
    startTime: absoluteUTC
  }
})
```

### Phase 3: Presenting Data (Frontend)
When the UI fetches data, Prisma returns pristine `UTC` dates (`2026-04-08T19:30:00.000Z`). To display "11:30", the frontend must utilize the same timezone package, projecting the UTC time specifically over the Restaurant's geographic zone, bypassing the browser's locality entirely.

**Correct Parsing Execution:**
```tsx
import { formatInTimeZone } from 'date-fns-tz'

// Fetch reservation and related restaurant details
const { startTime } = reservation // "2026-04-08T19:30:00.000Z" (UTC)
const { timezone } = restaurant   // "America/Santiago"

// Display safely independent of the user's physical laptop location
const displayTime = formatInTimeZone(startTime, timezone, 'HH:mm')
// Output -> "11:30"
```

*Anti-pattern:* `new Date(startTime)` - This will evaluate inside the browser's locality and drift offset values uncontrollably.

---

### Phase 4: Centralised Utility Layer (`lib/time-utils.ts`)
To enforce the above patterns consistently and prevent regressions, all timezone math is centralised in `lib/time-utils.ts`. **Never call `date-fns-tz` or raw `Date` constructors for business-logic time operations outside this file.**

| Utility | Use case |
|---|---|
| `getRestaurantTodayStr(tz)` | "Today" as `YYYY-MM-DD` in the restaurant's TZ (server & client) |
| `parseDateStr(dateStr)` | `YYYY-MM-DD` → UTC midnight `Date` for Prisma `@db.Date` columns |
| `toRestaurantUtcDate(date, time, tz)` | Wall-clock strings → absolute UTC (backend resolution) |
| `formatRestaurantTime(utcDate, tz, fmt)` | UTC DB value → display string, TZ-safe (replaces `new Date()` in UI) |
| `getRestaurantDayBounds(tz)` | `{ start, end }` UTC bounds for querying "today's" reservations |
| `toRestaurantDateFilter(dateStr)` | Safe Prisma date filter from a `YYYY-MM-DD` string |
| `parseDateForCalendar(dateStr)` | UTC-noon `Date` for calendar `selected` prop (presentational only) |
| `getRestaurantTodayForCalendar(tz)` | Calendar-safe "today" `Date` for `disabled` predicates |

---

## Migration Strategy

The following anti-patterns have been **fully remediated** across the codebase. Future contributors must not re-introduce them.

### ✅ Completed
1. All `useForm` schemas that previously used `z.date()` now use `z.string()`.
2. All `.toISOString()` calls inside React client components before form submission have been removed.
3. All `new Date(startTime)` calls parsing incoming server data in client components have been replaced with `formatRestaurantTime(..., timezone, ...)`.
4. All `new Date()` and `startOfDay(new Date())` calls used to compute "today" server-side now use `getRestaurantDayBounds(restaurant.timezone)`.
5. The `restaurant.timezone` field is included in every API response shape that exposes time data.

### 🔒 Rules for New Code
- **Server RSC / API routes computing "today"**: use `getRestaurantDayBounds(restaurant.timezone)` — never `startOfDay(new Date())`.
- **Inserting a `@db.Date` column**: use `toRestaurantDateFilter(dateStr)` or `parseDateStr(dateStr)` — never `new Date(dateStr)`.
- **Converting wall-clock → UTC for storage**: use `toRestaurantUtcDate(date, time, tz)` — never `new Date(\`${date}T${time}:00\`)`.
- **Displaying a UTC DB timestamp**: use `formatRestaurantTime(utcDate, tz, fmt)` or `formatInTimeZone` — never `new Date(utcDate)`.
- **Calendar `selected` / `disabled` props**: use `parseDateForCalendar` and `getRestaurantTodayForCalendar` — never `new Date()`.

