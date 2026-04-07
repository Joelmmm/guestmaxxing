import { expect, test, describe, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/restaurants/[restaurantId]/dining-areas/route";
import { clearDatabase, prisma } from "@/__tests__/helpers/db";
import {
  buildGetRequest,
  buildPostRequest,
  expectOk,
  expectStatus,
} from "@/__tests__/helpers/request";
import { seedRestaurant, seedDiningArea, seedTable } from "@/__tests__/helpers/seed";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:3000/api/restaurants";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Dining Areas API (/api/restaurants/[restaurantId]/dining-areas)", () => {
  beforeEach(clearDatabase);

  // -------------------------------------------------------------------------
  // GET /api/restaurants/[restaurantId]/dining-areas
  // -------------------------------------------------------------------------

  describe("GET", () => {
    test("should return an empty array when the restaurant has no dining areas", async () => {
      const restaurant = await seedRestaurant();

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/dining-areas`);
      const res = await GET(req, { params: Promise.resolve({ restaurantId: restaurant.id }) });

      const json = await expectOk<unknown[]>(res);
      expect(json).toHaveLength(0);
    });

    test("should return dining areas with their table counts", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id, { name: "Patio" });
      await seedTable(diningArea.id);
      await seedTable(diningArea.id, { name: "T2" });

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/dining-areas`);
      const res = await GET(req, { params: Promise.resolve({ restaurantId: restaurant.id }) });

      const json = await expectOk<{ id: string; name: string; _count: { tables: number } }[]>(res);
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Patio");
      expect(json[0]._count.tables).toBe(2);
    });

    test("should return 400 if restaurantId is an empty string", async () => {
      const req = buildGetRequest(`${BASE_URL}//dining-areas`);
      const res = await GET(req, { params: Promise.resolve({ restaurantId: "" }) });

      await expectStatus(res, 400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/restaurants/[restaurantId]/dining-areas
  // -------------------------------------------------------------------------

  describe("POST", () => {
    test("should create a dining area with name and description", async () => {
      const restaurant = await seedRestaurant();
      const payload = { name: "Main Dining Room", description: "Indoor seating area" };

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/dining-areas`, payload);
      const res = await POST(req, { params: Promise.resolve({ restaurantId: restaurant.id }) });

      const json = await expectOk<{
        id: string;
        name: string;
        description: string;
        restaurantId: string;
      }>(res);

      expect(json.name).toBe(payload.name);
      expect(json.description).toBe(payload.description);
      expect(json.restaurantId).toBe(restaurant.id);

      // Verify persistence
      const inDb = await prisma.diningArea.findUnique({ where: { id: json.id } });
      expect(inDb).toBeDefined();
      expect(inDb?.name).toBe(payload.name);
    });

    test("should create a dining area without an optional description", async () => {
      const restaurant = await seedRestaurant();
      const payload = { name: "Rooftop Bar" };

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/dining-areas`, payload);
      const res = await POST(req, { params: Promise.resolve({ restaurantId: restaurant.id }) });

      const json = await expectOk<{ id: string; name: string; description: string | null }>(res);
      expect(json.name).toBe("Rooftop Bar");
      expect(json.description).toBeNull();
    });

    test("should return 400 when name is missing", async () => {
      const restaurant = await seedRestaurant();

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/dining-areas`, {
        description: "No name provided",
      });
      const res = await POST(req, { params: Promise.resolve({ restaurantId: restaurant.id }) });

      await expectStatus(res, 400);
    });

    test("should return 400 when restaurantId is an empty string", async () => {
      const req = buildPostRequest(`${BASE_URL}//dining-areas`, { name: "Bar" });
      const res = await POST(req, { params: Promise.resolve({ restaurantId: "" }) });

      await expectStatus(res, 400);
    });
  });
});
