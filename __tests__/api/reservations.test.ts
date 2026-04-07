import { expect, test, describe, beforeEach } from "vitest";
import { POST } from "@/app/api/reservations/route";
import { clearDatabase, prisma } from "@/__tests__/helpers/db";
import { seedRestaurantFixture, seedGuest } from "@/__tests__/helpers/seed";
import { buildPostRequest, expectOk, expectStatus } from "@/__tests__/helpers/request";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const URL = "http://localhost:3000/api/reservations";

/** A Monday in the future that maps to dayOfWeek=1 */
const TEST_DATE = "2026-10-12";

// ---------------------------------------------------------------------------
// Payload factory
// ---------------------------------------------------------------------------

/**
 * Builds a reservation payload for the given restaurant/guest context.
 *
 * @param restaurantId  Target restaurant
 * @param guestId       Guest performing the booking
 * @param date          ISO date string (YYYY-MM-DD) — must match seeded operating hours
 * @param timeUtc       HH:MM in UTC (e.g. "19:00")
 * @param tableIds      Optional explicit table IDs for pinned-table tests
 * @param durationMins  Duration of the reservation in minutes (default 90)
 */
function buildReservationPayload(
  restaurantId: string,
  guestId: string,
  date: string,
  timeUtc: string,
  tableIds?: string[],
  durationMins = 90
) {
  const startTime = `${date}T${timeUtc}:00.000Z`;
  const endTime = new Date(
    new Date(startTime).getTime() + durationMins * 60_000
  ).toISOString();

  const payload: Record<string, unknown> = {
    restaurantId,
    guestId,
    guestData: {
      firstName: "Test",
      lastName: "Guest",
      email: "guest@example.com",
      phone: "123456789",
    },
    partySize: 2,
    reservationDate: date,
    startTime: timeUtc,
    durationMins,
  };

  if (tableIds !== undefined) {
    payload.tableIds = tableIds;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("POST /api/reservations", () => {
  let restaurantId: string;
  let table1Id: string;
  let table2Id: string;
  let guestId: string;

  beforeEach(async () => {
    await clearDatabase();

    const { restaurant, tables } = await seedRestaurantFixture(
      2,               // 2 tables
      "America/Santiago",
      1                // Monday
    );
    restaurantId = restaurant.id;
    table1Id = tables[0].id;
    table2Id = tables[1].id;

    const guest = await seedGuest();
    guestId = guest.id;
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  test("should create a reservation with dynamic table assignment", async () => {
    const payload = buildReservationPayload(restaurantId, guestId, TEST_DATE, "19:00");
    const req = buildPostRequest(URL, payload);
    const res = await POST(req);

    const json = await expectOk<{ id: string }>(res);

    const inDb = await prisma.reservation.findUnique({
      where: { id: json.id },
      include: { tables: true },
    });

    expect(inDb?.tables).toHaveLength(1);
    expect([table1Id, table2Id]).toContain(inDb?.tables[0].tableId);
  });

  // -------------------------------------------------------------------------
  // Concurrency — the core guarantee
  // -------------------------------------------------------------------------

  test("should assign different tables to two concurrent bookings when both tables are available", async () => {
    const req1 = buildPostRequest(URL, buildReservationPayload(restaurantId, guestId, TEST_DATE, "19:00"));
    const req2 = buildPostRequest(URL, buildReservationPayload(restaurantId, guestId, TEST_DATE, "19:00"));

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

    const j1 = await expectOk<{ id: string }>(res1);
    const j2 = await expectOk<{ id: string }>(res2);

    const [db1, db2] = await Promise.all([
      prisma.reservation.findUnique({ where: { id: j1.id }, include: { tables: true } }),
      prisma.reservation.findUnique({ where: { id: j2.id }, include: { tables: true } }),
    ]);

    // Each reservation should have been assigned a *different* valid table
    expect(db1?.tables[0].tableId).not.toBe(db2?.tables[0].tableId);
  });

  test("should return 409 for one request when only one table is available and two concurrent bookings race", async () => {
    // Reduce inventory to 1 table
    await prisma.table.delete({ where: { id: table2Id } });

    const req1 = buildPostRequest(URL, buildReservationPayload(restaurantId, guestId, TEST_DATE, "19:00"));
    const req2 = buildPostRequest(URL, buildReservationPayload(restaurantId, guestId, TEST_DATE, "19:00"));

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  // -------------------------------------------------------------------------
  // Explicit table selection
  // -------------------------------------------------------------------------

  test("should return 409 for one request when both requests explicitly request the same table", async () => {
    const payload = buildReservationPayload(restaurantId, guestId, TEST_DATE, "19:00", [table1Id]);

    const req1 = buildPostRequest(URL, payload);
    const req2 = buildPostRequest(URL, payload);

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  test("should return 400 when required fields are missing", async () => {
    const req = buildPostRequest(URL, { restaurantId });
    const res = await POST(req);
    await expectStatus(res, 400);
  });
});