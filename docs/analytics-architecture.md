# Analytics Architecture

This document outlines the architectural decisions, patterns, and guidelines used to implement the Analytics Dashboard in the Reserva platform.

## 1. Overview
The Analytics feature is designed to provide actionable insights for restaurant operators. It relies on a strictly decoupled architecture that separates data fetching (Service Layer), time-handling (Wall-Clock Intent), and data presentation (Vercel Composition Patterns).

## 2. Server-Driven Architecture
We follow the **Service-Controller Architecture** outlined in `AGENTS.md`, specifically tailored for the Next.js App Router:

- **No Unnecessary API Routes:** Since the Dashboard Analytics is requested on page load, data is fetched directly within the Next.js Server Component (`AnalyticsPage`). We do NOT create intermediate `/api/analytics` endpoints unless the data needs to be fetched dynamically via client-side interactions after load.
- **Service Layer (`lib/analytics/`)**: All business logic for data aggregation lives here as pure, reusable async functions.
  - `stats.ts`: Calculates aggregate metrics (e.g., Total Reservations, Average Party Size, Peak Hours, Returning Guests) and percentage changes across comparative periods.
  - `trends.ts`: Calculates time-series data (e.g., Bookings per day) for chart visualization.
  - `utils.ts`: Contains shared mathematical logic (like `calculateChange`) to keep the services DRY.

## 3. Time Handling (Wall-Clock Intent)
Timezone management is the most critical aspect of the analytics service. Restaurants operate in local timezones, but dates are stored in the database as UTC.

**Strict Rules:**
- NEVER use `startOfDay(new Date())` or derive business-local date boundaries using the server's locale.
- ALWAYS use `time-utils.ts` functions (e.g., `getRestaurantTodayStr`, `parseDateStr`, `getRestaurantDayBounds`) to generate precise UTC boundaries anchored to the restaurant's specific timezone.
- **Example:** When querying the last 30 days, we compute the exact local date string for "today" in the restaurant's timezone, parse that back into a strict UTC midnight, and subtract 30 days. This completely eliminates "timezone drift" where late-night reservations might spill over into the next day in UTC.

## 4. Frontend Composition Patterns
The UI strictly adheres to **Vercel Composition Patterns** and the **shadcn UI** guidelines.

- **Data Fetching:** The top-level Server Component (`app/(dashboard)/dashboard/analytics/page.tsx`) handles all data fetching and passes plain data objects down to client components via props.
- **Dumb Components (`components/analytics/`)**: Client components (like `ReservationTrendsChart`) are purely presentational. They do not maintain internal data fetching state (`useState`/`useEffect`). This prevents state synchronization anti-patterns.
- **Shadcn Charts:** We leverage `recharts` wrapped in shadcn's `ChartContainer` to ensure charts are fully themeable and inherit CSS variables dynamically (e.g., `hsl(var(--primary))`).

## 5. Aggregation Strategy
For time-series data (like Reservation Trends), calculating daily aggregates via raw SQL `GROUP BY` in Prisma can be problematic when accounting for different timezones dynamically.
- **In-Memory Bucketing:** We fetch the raw reservations for the requested period (filtered correctly by UTC boundaries) and group them by day in-memory using `date-fns` formatting. 
- **Zero-Filling Data:** We utilize `eachDayOfInterval` to pre-fill our dataset with all days in the requested date range. This guarantees that "zero-booking" days are properly rendered in the chart rather than being skipped.
