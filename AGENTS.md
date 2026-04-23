# AGENTS.md

This document serves as the source of truth for architectural decisions, coding standards, and project progress for Antigravity agents.

## 🏗️ Architectural Standards

### 1. Centralized Validation Layer
A robust validation layer has been established to ensure data integrity across the frontend and backend.

- **Schemas**: All Zod schemas MUST be defined in `lib/validations/`.
- **Naming**: Use the format `[entity]Schema` (e.g., `restaurantSchema`) and export `[Entity]FormValues` (e.g., `RestaurantFormValues`).
- **Best Practices**:
  - Use `.trim()` on string fields to clean inputs.
  - Use `.optional().or(z.literal(""))` for optional string fields to maintain compatibility with HTML form inputs.
  - Use `z.coerce` for numbers and dates to simplify API route logic.

### 2. Backend (API) Standards
Standardized API request handling is mandatory for consistency and security.

- **Request Validation**: Use the `validateBody(schema, body)` utility from `@/lib/api-utils.ts`.
- **Response Format**: `validateBody` automatically returns a 400 Bad Request with standardized error details if validation fails.
- **Example Usage**:
  ```typescript
  const body = await req.json();
  const validation = validateBody(restaurantSchema, body);
  if (!validation.isValid) return validation.response;
  const { name, timezone } = validation.data; // data is now type-safe
  ```

### 3. Frontend (UI) Standards
- **Form Handling**: Use `react-hook-form` with `@hookform/resolvers/zod`.
- **Schema Reuse**: Always import schemas from `lib/validations/`.
- **Consistency**: Align field names in the form with the API payload. For example, reservations use a nested `guestData` object.
- **Data Fetching (Anti-Pattern Avoidance)**: Do NOT duplicate server data into client state (`useState(initialData)` + `useEffect`). Client components should be "dumb" and rely on data passed directly from Server Components.
- **Mutations (Server Actions)**: Trigger updates using Server Actions (`app/actions/`) wrapped in a `useTransition` hook instead of manually caching and using `fetch()`. The Server Action must execute the service logic and call `revalidatePath('/dashboard')` to natively stream the fresh data to the layout.

### 4. The Service-Controller Architecture
Business logic has been decoupled from the API routes ("Controllers") to create a clean separation of concerns and avoid duplicated code.

- **Service Layer (`lib/services/`)**: ALL core business logic, database transactions (`prisma.$transaction`), and complex state transitions MUST live here as pure functions. E.g., `createReservation(data)` in `lib/services/reservations.ts`.
- **API Routes (`app/api/`)**: Act STRICTLY as external-facing Controllers. They receive an HTTP `Request`, validate the payload, pass data to the service layer, and return an HTTP `Response`. No raw database manipulation!
- **Server Actions (`app/actions/`)**: Act STRICTLY as internal UI bridges. They receive plain objects from forms, pass the data to the service layer, trigger Next.js cache invalidations (`revalidatePath`), and return `{ success, data, error }`.

## 📈 Project Progress

### Completed Refactors
The following entities have been fully migrated to the centralized validation layer:
- [x] **Restaurants**: `POST /api/restaurants` and `RestaurantDialog`
- [x] **Dining Areas**: `POST /api/restaurants/[id]/dining-areas` and `DiningAreaDialog`
- [x] **Tables**: `POST /api/restaurants/[id]/tables` and `TableDialog`
- [x] **Guests**: `POST /api/guests` and `GuestDialog`
- [x] **Reservations**: `POST /api/reservations` and `ReservationDialog` (includes nested guest logic)

## 📌 Implementation Notes
- **Time/Date**: Reservations use `reservationDate` (Date) and `startTime`/`endTime` (ISO strings) for persistence, while the UI calculates the full Date objects for standard API delivery.
- **Error Mapping**: When the API returns a 409 Conflict (e.g., overlapping table booking), the UI should map this error to the specific field (usually `tableIds`).
