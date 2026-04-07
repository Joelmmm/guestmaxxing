import { expect, test, describe, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/restaurants/[restaurantId]/operating-hours/route";
import { clearDatabase, prisma } from "@/__tests__/helpers/db";
import {
  buildGetRequest,
  buildPostRequest,
  expectOk,
  expectStatus,
} from "@/__tests__/helpers/request";
import { seedRestaurant, seedOperatingHours } from "@/__tests__/helpers/seed";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:3000/api/restaurants";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Operating Hours API (/api/restaurants/[restaurantId]/operating-hours)", () => {
  beforeEach(clearDatabase);

  // -------------------------------------------------------------------------
  // GET
  // -------------------------------------------------------------------------
  describe("GET", () => {
    test("should return empty hours and overrides if none exist", async () => {
      const restaurant = await seedRestaurant();
      
      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/operating-hours`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{ hours: unknown[]; overrides: unknown[] }>(res);
      expect(json.hours).toHaveLength(0);
      expect(json.overrides).toHaveLength(0);
    });

    test("should return existing operating hours", async () => {
      const restaurant = await seedRestaurant();
      await seedOperatingHours(restaurant.id, 1, [{ openTime: "09:00", closeTime: "17:00" }]);

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/operating-hours`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{ hours: { dayOfWeek: number; slots: any[] }[]; overrides: unknown[] }>(res);
      expect(json.hours).toHaveLength(1);
      expect(json.hours[0].dayOfWeek).toBe(1);
      expect(json.hours[0].slots).toHaveLength(1);
      expect(json.hours[0].slots[0].openTime).toBe("09:00");
    });
  });

  // -------------------------------------------------------------------------
  // POST
  // -------------------------------------------------------------------------
  describe("POST", () => {
    test("should create new operating hours", async () => {
      const restaurant = await seedRestaurant();

      const payload = {
        type: "HOURS",
        data: {
          dayOfWeek: 2,
          slots: [{ openTime: "08:00", closeTime: "18:00" }],
        },
      };

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/operating-hours`, payload);
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{ id: string; dayOfWeek: number; slots: any[] }>(res);
      expect(json.dayOfWeek).toBe(2);
      expect(json.slots).toHaveLength(1);
      expect(json.slots[0].openTime).toBe("08:00");

      const inDb = await prisma.operatingHours.findFirst({
        where: { restaurantId: restaurant.id, dayOfWeek: 2 },
        include: { slots: true },
      });
      expect(inDb).toBeDefined();
      expect(inDb?.slots[0].openTime).toBe("08:00");
    });

    test("should update existing operating hours for the same day (enforcing unique constraint abstraction)", async () => {
      const restaurant = await seedRestaurant();
      await seedOperatingHours(restaurant.id, 1, [{ openTime: "09:00", closeTime: "12:00" }]);

      const payload = {
        type: "HOURS",
        data: {
          dayOfWeek: 1,
          slots: [{ openTime: "13:00", closeTime: "17:00" }],
        },
      };

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/operating-hours`, payload);
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{ id: string; dayOfWeek: number; slots: any[] }>(res);
      expect(json.dayOfWeek).toBe(1);
      expect(json.slots).toHaveLength(1);
      expect(json.slots[0].openTime).toBe("13:00");

      const inDb = await prisma.operatingHours.findMany({
        where: { restaurantId: restaurant.id, dayOfWeek: 1 },
      });
      // Should not have created a duplicate dayOfWeek entry
      expect(inDb).toHaveLength(1);
    });

    test("should return 400 when type is invalid", async () => {
      const restaurant = await seedRestaurant();
      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/operating-hours`, {
        type: "INVALID_TYPE",
        data: {},
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });
      await expectStatus(res, 400);
    });

    test("should return validation error 400 when dayOfWeek is out of range", async () => {
      const restaurant = await seedRestaurant();
      const payload = {
        type: "HOURS",
        data: {
          dayOfWeek: 8, // Invalid
          slots: [{ openTime: "08:00", closeTime: "18:00" }],
        },
      };
      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/operating-hours`, payload);
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });
      await expectStatus(res, 400);
    });

    test("should return validation error 400 when an individual slot has reversed times", async () => {
      const restaurant = await seedRestaurant();
      const payload = {
        type: "HOURS",
        data: {
          dayOfWeek: 1,
          slots: [{ openTime: "18:00", closeTime: "08:00" }], // Reversed
        },
      };
      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/operating-hours`, payload);
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });
      await expectStatus(res, 400);
    });

    test("should return validation error 400 when slots overlap", async () => {
      const restaurant = await seedRestaurant();
      const payload = {
        type: "HOURS",
        data: {
          dayOfWeek: 1,
          slots: [
            { openTime: "08:00", closeTime: "12:00" },
            { openTime: "10:00", closeTime: "14:00" }, // Overlaps with previous slot
          ],
        },
      };
      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/operating-hours`, payload);
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });
      await expectStatus(res, 400);
    });
  });

  // -------------------------------------------------------------------------
  // Prisma Constraints Tests
  // -------------------------------------------------------------------------
  describe("Prisma Layer Constraints", () => {
    test("cascade delete removes operating hours when a restaurant is deleted", async () => {
      const restaurant = await seedRestaurant();
      await seedOperatingHours(restaurant.id, 2, [{ openTime: "10:00", closeTime: "22:00" }]);

      const hoursCountBefore = await prisma.operatingHours.count();
      expect(hoursCountBefore).toBe(1);

      await prisma.restaurant.delete({ where: { id: restaurant.id } });

      const hoursCountAfter = await prisma.operatingHours.count();
      expect(hoursCountAfter).toBe(0);
    });

    test("unique constraint enforces only one operating hour record per day per restaurant", async () => {
      const restaurant = await seedRestaurant();
      await seedOperatingHours(restaurant.id, 3, [{ openTime: "09:00", closeTime: "17:00" }]);

      // Attempt to directly create another one mapping to the same restaurantId and dayOfWeek
      await expect(
        prisma.operatingHours.create({
          data: {
            restaurantId: restaurant.id,
            dayOfWeek: 3,
            slots: {
              create: [{ openTime: "18:00", closeTime: "22:00" }],
            },
          },
        })
      ).rejects.toThrow();
    });
  });
});
