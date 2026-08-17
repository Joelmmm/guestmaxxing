import { beforeEach, expect, test, describe } from "vitest";
import { GET } from "@/app/api/availability/route";
import { getAvailableSlotsForDate } from "@/lib/availability";
import { clearDatabase } from "@/__tests__/helpers/db";
import {
  seedGuest,
  seedReservation,
  seedRestaurantFixture,
} from "@/__tests__/helpers/seed";
import { buildGetRequest, expectStatus } from "@/__tests__/helpers/request";

describe("GET /api/availability", () => {
  beforeEach(clearDatabase);

  test("should return 400 when required query parameters are missing", async () => {
    const req = buildGetRequest("http://localhost:3000/api/availability");
    const res = await GET(req);

    await expectStatus(res, 400);

    const json = await res.json();
    expect(json.error).toBe("Invalid availability query parameters");
    expect(json.details).toBeDefined();

    // Each required field should have a validation error
    expect(json.details.restaurantId).toBeDefined();
    expect(json.details.date).toBeDefined();
    expect(json.details.time).toBeDefined();
    expect(json.details.partySize).toBeDefined();
  });

  test("excludes slots occupied by a LATE reservation", async () => {
    const { restaurant, tables } = await seedRestaurantFixture(1, "UTC", 1);
    const guest = await seedGuest({ email: "late-availability@example.com" });

    await seedReservation(restaurant.id, guest.id, {
      status: "LATE",
      startTime: new Date("2026-10-12T19:00:00.000Z"),
      endTime: new Date("2026-10-12T20:30:00.000Z"),
      tableIds: [tables[0].id],
    });

    const slots = await getAvailableSlotsForDate({
      restaurantId: restaurant.id,
      date: "2026-10-12",
      partySize: 2,
      restaurantTimezone: "UTC",
    });

    expect(slots).not.toContain("19:00");
  });
});
