import { expect, test, describe, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/restaurants/[restaurantId]/tables/route";
import { clearDatabase, prisma } from "@/__tests__/helpers/db";
import {
  buildGetRequest,
  buildPostRequest,
  expectOk,
  expectStatus,
} from "@/__tests__/helpers/request";
import {
  seedRestaurant,
  seedDiningArea,
  seedTable,
} from "@/__tests__/helpers/seed";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:3000/api/restaurants";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Tables API (/api/restaurants/[restaurantId]/tables)", () => {
  beforeEach(clearDatabase);

  // -------------------------------------------------------------------------
  // GET /api/restaurants/[restaurantId]/tables
  // -------------------------------------------------------------------------

  describe("GET", () => {
    test("should return an empty array when the restaurant has no active dining areas", async () => {
      const restaurant = await seedRestaurant();

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/tables`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<unknown[]>(res);
      expect(json).toHaveLength(0);
    });

    test("should return dining areas with their active tables", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id, {
        name: "Main Room",
      });
      await seedTable(diningArea.id, { name: "T1" });
      await seedTable(diningArea.id, { name: "T2" });

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/tables`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<
        { id: string; name: string; tables: { name: string }[] }[]
      >(res);

      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Main Room");
      expect(json[0].tables).toHaveLength(2);
    });

    test("should order tables alphabetically within each dining area", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);
      await seedTable(diningArea.id, { name: "Zeta" });
      await seedTable(diningArea.id, { name: "Alpha" });
      await seedTable(diningArea.id, { name: "Mango" });

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/tables`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<
        { tables: { name: string }[] }[]
      >(res);
      const tableNames = json[0].tables.map((t) => t.name);
      expect(tableNames).toEqual(["Alpha", "Mango", "Zeta"]);
    });

    test("should exclude inactive dining areas", async () => {
      const restaurant = await seedRestaurant();
      // Create an inactive dining area
      await prisma.diningArea.create({
        data: {
          restaurantId: restaurant.id,
          name: "Closed Section",
          isActive: false,
        },
      });

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/tables`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<unknown[]>(res);
      expect(json).toHaveLength(0);
    });

    test("should exclude inactive tables within an active dining area", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);
      await seedTable(diningArea.id, { name: "Active Table" });
      // Create an inactive table directly
      await prisma.table.create({
        data: {
          diningAreaId: diningArea.id,
          name: "Inactive Table",
          minCapacity: 2,
          maxCapacity: 4,
          isActive: false,
        },
      });

      const req = buildGetRequest(`${BASE_URL}/${restaurant.id}/tables`);
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{ tables: { name: string }[] }[]>(res);
      expect(json[0].tables).toHaveLength(1);
      expect(json[0].tables[0].name).toBe("Active Table");
    });

    test("should return an empty array for a non-existent restaurantId", async () => {
      const req = buildGetRequest(
        `${BASE_URL}/non-existent-id/tables`
      );
      const res = await GET(req, {
        params: Promise.resolve({ restaurantId: "non-existent-id" }),
      });

      const json = await expectOk<unknown[]>(res);
      expect(json).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/restaurants/[restaurantId]/tables
  // -------------------------------------------------------------------------

  describe("POST", () => {
    test("should create a table with all required fields", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);

      const payload = {
        name: "Table 01",
        minCapacity: 2,
        maxCapacity: 4,
        diningAreaId: diningArea.id,
      };

      const req = buildPostRequest(
        `${BASE_URL}/${restaurant.id}/tables`,
        payload
      );
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{
        id: string;
        name: string;
        minCapacity: number;
        maxCapacity: number;
        diningAreaId: string;
        isActive: boolean;
      }>(res);

      expect(json.name).toBe(payload.name);
      expect(json.minCapacity).toBe(payload.minCapacity);
      expect(json.maxCapacity).toBe(payload.maxCapacity);
      expect(json.diningAreaId).toBe(diningArea.id);
      expect(json.isActive).toBe(true); // default

      // Verify persistence
      const inDb = await prisma.table.findUnique({ where: { id: json.id } });
      expect(inDb).toBeDefined();
      expect(inDb?.name).toBe(payload.name);
    });

    test("should create a table with isActive explicitly set to false", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);

      const payload = {
        name: "Reserved Table",
        minCapacity: 1,
        maxCapacity: 2,
        diningAreaId: diningArea.id,
        isActive: false,
      };

      const req = buildPostRequest(
        `${BASE_URL}/${restaurant.id}/tables`,
        payload
      );
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      const json = await expectOk<{ isActive: boolean }>(res);
      expect(json.isActive).toBe(false);
    });

    test("should return 400 when name is missing", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/tables`, {
        minCapacity: 2,
        maxCapacity: 4,
        diningAreaId: diningArea.id,
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      await expectStatus(res, 400);
    });

    test("should return 400 when minCapacity is missing", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/tables`, {
        name: "Table A",
        maxCapacity: 4,
        diningAreaId: diningArea.id,
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      await expectStatus(res, 400);
    });

    test("should return 400 when maxCapacity is less than minCapacity", async () => {
      const restaurant = await seedRestaurant();
      const diningArea = await seedDiningArea(restaurant.id);

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/tables`, {
        name: "Table A",
        minCapacity: 6,
        maxCapacity: 2, // violates the schema refine
        diningAreaId: diningArea.id,
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      await expectStatus(res, 400);
    });

    test("should return 400 when diningAreaId is missing", async () => {
      const restaurant = await seedRestaurant();

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/tables`, {
        name: "Table A",
        minCapacity: 2,
        maxCapacity: 4,
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      await expectStatus(res, 400);
    });

    test("should return 404 when diningAreaId does not belong to the restaurant", async () => {
      const restaurant = await seedRestaurant();
      const otherRestaurant = await seedRestaurant({
        name: "Other Place",
        slug: "other-place",
      });
      const otherDiningArea = await seedDiningArea(otherRestaurant.id);

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/tables`, {
        name: "Table A",
        minCapacity: 2,
        maxCapacity: 4,
        diningAreaId: otherDiningArea.id,
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      await expectStatus(res, 404);
    });

    test("should return 404 when diningAreaId is a valid UUID but does not exist at all", async () => {
      const restaurant = await seedRestaurant();
      const fakeDiningAreaId = "00000000-0000-0000-0000-000000000000";

      const req = buildPostRequest(`${BASE_URL}/${restaurant.id}/tables`, {
        name: "Ghost Table",
        minCapacity: 2,
        maxCapacity: 4,
        diningAreaId: fakeDiningAreaId,
      });
      const res = await POST(req, {
        params: Promise.resolve({ restaurantId: restaurant.id }),
      });

      await expectStatus(res, 404);
    });
  });
});
