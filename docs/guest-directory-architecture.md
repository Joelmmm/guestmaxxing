# Guest Directory Architecture & MVP

## The Conceptual Model
As reservations grow, the standard "Guest Directory" becomes a bottleneck if treated simply as a database dump (`findMany` of all guests). A typical manager uses this page not to view all guests, but to find a specific guest or review strategic segments (VIPs, new guests, guests with specific notes).

To scale technically and ergonomically, the Guest Directory is designed as a **Segmented & Search-First Interface**. 

### The Ultimate Vision (CRM Architecture)
In the mature version, the URL serves as the sole source of truth for the view:
*   `?segment=vips&q=smith` 
*   **Segments (Lenses):** Active Guests, VIPs, New Guests, "Needs Attention" (Has notes).
*   **Optimization:** Highly active sites process aggregates via background jobs, denormalizing data such as `visitCount` and `lastVisitDate` to the `Guest` model to avoid `JOIN`/`GROUP BY` overhead.
*   **UI Dashboard:** Top-level metric cards (`GuestsMetrics` with Suspense streaming) showing live counts of each segment, above a robust data table (`GuestsTable` and `GuestsFilters`).

## The MVP Implementation Strategy
To deliver immediate value without complex schema migrations or denormalization triggers, the MVP utilizes Next.js Server Components with URL `searchParams` reading, driving native Prisma queries on existing fields.

### Core Features (MVP)
1.  **URL-Driven Tabs:** Use query params (`?tab=vips`) to navigate lenses.
    *   `all`: Default `orderBy: { createdAt: 'desc' }`
    *   `vips`: `orderBy: { reservations: { _count: 'desc' } }`
    *   `new`: `orderBy: { createdAt: 'desc' }`
    *   `notes`: `where: { notes: { not: null } }`
2.  **Global Search:** Simple text search using Prisma `contains` (case-insensitive) on `firstName`, `lastName`, `email`, and `phone`.
3.  **Basic Pagination (Server-Side):** `take: 15` and `skip: (page - 1) * 15`.

### Components involved in MVP
*   **`guests/page.tsx`**: A Server Component extracting `searchParams`, calculating the Prisma `where` / `orderBy` object, fetching the data segment, and determining `totalPages`.
*   **`GuestsFilters`**: A Client Component holding the Tabs and a text input that modifies the URL (`useRouter`, `useSearchParams`).
*   **`GuestsTable`**: A Client Component simply rendering the data block and providing pagination controls that modify the `page` param in the URL.
