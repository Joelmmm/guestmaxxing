# AGENTS.md — API Test Suite

This document is the authoritative guide for writing, extending, and reviewing API integration tests in `__tests__/api/`.

---

## 📁 Directory Structure

```
__tests__/
  helpers/
    db.ts        — clearDatabase(), prisma re-export
    seed.ts      — Entity factory functions (seedRestaurant, seedTable, …)
    request.ts   — buildPostRequest(), buildGetRequest(), expectOk(), expectStatus()
  api/
    restaurant.test.ts
    reservations.test.ts
    availability.test.ts
    dining-areas.test.ts
    tables.test.ts
    AGENTS.md    ← you are here
```

---

## ✅ Rules & Patterns

### 1. Always `clearDatabase()` in `beforeEach`

```ts
import { clearDatabase } from "@/__tests__/helpers/db";

beforeEach(clearDatabase);
```

- **Never** call `prisma.X.deleteMany()` directly in a test file.
- The deletion order in `clearDatabase()` respects FK constraints. If you add a new model with FKs, update `helpers/db.ts` first.

---

### 2. Use seed factories, never raw `prisma.create`

```ts
// ✅ Do this
const { restaurant, tables } = await seedRestaurantFixture(2);

// ❌ Not this
const restaurant = await prisma.restaurant.create({ data: { ... } });
```

- `seedRestaurantFixture(tableCount, timezone, dayOfWeek)` is the one-liner for reservation tests.
- Use `seedRestaurant`, `seedDiningArea`, `seedTable`, `seedGuest`, `seedOperatingHours` for targeted partial seeding.
- Add new factories to `helpers/seed.ts` — do not inline `prisma.create` blocks in test files.

---

### 3. Use `buildPostRequest` / `buildGetRequest` for every route call

```ts
import { buildPostRequest, buildGetRequest } from "@/__tests__/helpers/request";

const req = buildPostRequest("http://localhost:3000/api/restaurants", payload);
const res = await POST(req);
```

- The helpers set the correct `Content-Type` header automatically.
- **Never** construct `new NextRequest(...)` inline in a test file.

---

### 4. Use `expectOk` and `expectStatus` — never read `.text()` manually

```ts
import { expectOk, expectStatus } from "@/__tests__/helpers/request";

// For 200 responses — returns parsed JSON
const json = await expectOk<{ id: string; name: string }>(res);

// For any other expected status
await expectStatus(res, 400);
await expectStatus(res, 409);
```

- `expectOk` prevents the double-consume footgun (calling `.text()` then `.json()` on the same stream).
- Both helpers include the raw response body in the assertion failure message, so `console.log` debugging is unnecessary.

---

### 5. Name tests in plain English — describe the behaviour, not the code

```ts
// ✅ Good
test("should return 409 when two concurrent requests compete for the last table", ...)

// ❌ Avoid
test("Scenario 3: Complete Depletion Conflict", ...)
```

Use `describe` blocks to group related scenarios (happy path, concurrency, validation).

---

### 6. One concept per test

Each test should assert a single behavioural outcome. If a test needs multiple assertions to verify one thing (e.g., DB persistence + response shape), that is fine — but don't combine a happy-path assertion with an error-case assertion in the same test.

---

### 7. Test against the real test database

- Tests in this directory hit a *real* PostgreSQL test database (`DATABASE_URL` is set per environment, see `.env.test`).
- **Do not mock Prisma or route handlers.** The goal is integration coverage, not unit coverage.
- If you need to test a pure utility function, place it in `__tests__/unit/` (not here).

---

### 8. Concurrency tests use `Promise.all`

```ts
const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

const statuses = [res1.status, res2.status].sort();
expect(statuses).toEqual([200, 409]);
```

- Always `.sort()` the status array before asserting — request order is non-deterministic.
- Each concurrent request must get its own `NextRequest` instance (do not share).

---

### 9. Type your `expectOk` generics

```ts
// ✅ Annotate the expected shape
const json = await expectOk<{ id: string; slug: string }>(res);

// It's OK to use unknown when shape doesn't matter
const json = await expectOk(res);
```

---

### 10. Never enable `fileParallelism` — all test files must run sequentially

All test files share a **single PostgreSQL test database**. Vitest runs files in parallel by default, which causes `clearDatabase()` in one file to delete rows that another file just seeded — producing FK constraint violations.

`vitest.config.ts` sets `fileParallelism: false` — **do not remove this**.

> **Scaling note:** If the suite grows large and sequential execution becomes too slow, the right fix is sharding across multiple isolated test databases (one per Vitest worker), not re-enabling `fileParallelism`.

---

## 🚫 Anti-Patterns to Avoid

| Anti-pattern | Why | Fix |
|---|---|---|
| `let resText = ""; if (res.status !== 200) { resText = await res.text(); }` | Manual debug logging, double-consume risk | Use `expectOk` or `expectStatus` |
| Inline `prisma.restaurant.create(...)` in tests | Duplicates seed logic | Use `seedRestaurant()` |
| Inline `new NextRequest(...)` in tests | Duplicates boilerplate | Use `buildPostRequest()` |
| Commenting out test suites with `/* */` | Hides broken tests | Fix or `test.skip` with a reason |
| `test.only` committed to main | Silently skips other tests in CI | Always clean up `only` before committing |
| Removing `fileParallelism: false` from `vitest.config.ts` | Parallel files race on `clearDatabase()` → FK violations | Keep it; see Rule 10 |

---

## 🔧 Adding a New Test File

1. Create `__tests__/api/<entity>.test.ts`.
2. Import `clearDatabase` and call it in `beforeEach`.
3. Seed test data with helpers from `helpers/seed.ts`.
4. Build requests with `buildPostRequest` / `buildGetRequest`.
5. Assert with `expectOk` / `expectStatus`.
6. Update this `AGENTS.md` if you add a new helper or pattern.
7. Add the new file to the directory structure above.

---

## 📦 Helper Reference

### `helpers/db.ts`
| Export | Description |
|---|---|
| `clearDatabase()` | Deletes all rows in FK-safe order |
| `prisma` | Re-exported Prisma client for ad-hoc DB assertions |

### `helpers/seed.ts`
| Export | Description |
|---|---|
| `seedRestaurant(overrides?)` | Creates a Restaurant |
| `seedDiningArea(restaurantId, overrides?)` | Creates a DiningArea |
| `seedTable(diningAreaId, overrides?)` | Creates a Table |
| `seedGuest(overrides?)` | Creates a Guest |
| `seedOperatingHours(restaurantId, dayOfWeek?, slots?)` | Creates OperatingHours with time slots |
| `seedRestaurantFixture(tableCount?, timezone?, dayOfWeek?)` | Creates a full restaurant + dining area + N tables + hours |

### `helpers/request.ts`
| Export | Description |
|---|---|
| `buildPostRequest(url, payload)` | Returns a `NextRequest` with `POST` + JSON body |
| `buildGetRequest(url)` | Returns a `NextRequest` with `GET` |
| `expectOk<T>(res)` | Asserts `200` and returns `T`; includes error body on failure |
| `expectStatus(res, status)` | Asserts specific status code; includes body on failure |
