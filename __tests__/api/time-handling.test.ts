import { expect, test, describe, beforeEach } from "vitest";
import { POST } from "@/app/api/reservations/route";
import { clearDatabase, prisma } from "@/__tests__/helpers/db";
import { seedRestaurantFixture, seedGuest } from "@/__tests__/helpers/seed";
import { buildPostRequest, expectOk, expectStatus } from "@/__tests__/helpers/request";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const URL = "http://localhost:3000/api/reservations";
const TEST_DATE_STR = "2026-10-12"; // A Monday
const TEST_TIME_STR = "11:30";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("POST /api/reservations - Time Handling (Wall-Clock Intent)", () => {
  let guestId: string;

  beforeEach(async () => {
    // setup-beforeeach-cleanup
    await clearDatabase();
    
    const guest = await seedGuest();
    guestId = guest.id;
  });

  describe("Timezone Resolution Constraints", () => {
    // -------------------------------------------------------------------------
    // Test America/New_York
    // -------------------------------------------------------------------------
    test("should correctly resolve '11:30' for 'America/New_York' (EDT)", async () => {
      // 1. Setup restaurant in America/New_York
      const { restaurant } = await seedRestaurantFixture(2, "America/New_York", 1);
      
      const payload = {
        restaurantId: restaurant.id,
        guestId,
        guestData: {
          firstName: "John",
          lastName: "Doe"
        },
        partySize: 2,
        reservationDate: TEST_DATE_STR, 
        startTime: TEST_TIME_STR,
        durationMins: 90
      };

      // 3. Perform booking
      const req = buildPostRequest(URL, payload);
      const res = await POST(req);
      const json = await expectOk<{ id: string }>(res);

      // 4. Verify absolute UTC time stored in DB
      const inDb = await prisma.reservation.findUnique({ where: { id: json.id } });
      expect(inDb).toBeDefined();

      // America/New_York in October is EDT (UTC-4). 
      // 11:30 EDT -> 15:30 UTC
      const expectedUtcTime = `${TEST_DATE_STR}T15:30:00.000Z`;
      
      // assert-specific-matchers
      expect(inDb?.startTime.toISOString()).toBe(expectedUtcTime);
      
      // Optionally check endTime calculation
      const expectedEndUtcTime = `${TEST_DATE_STR}T17:00:00.000Z`;
      expect(inDb?.endTime.toISOString()).toBe(expectedEndUtcTime);
    });

    // -------------------------------------------------------------------------
    // Test Asia/Tokyo
    // -------------------------------------------------------------------------
    test("should correctly resolve '11:30' for 'Asia/Tokyo' (JST)", async () => {
      // 1. Setup restaurant in Asia/Tokyo
      const { restaurant } = await seedRestaurantFixture(2, "Asia/Tokyo", 1);
      
      const payload = {
        restaurantId: restaurant.id,
        guestId,
        guestData: {
          firstName: "John",
          lastName: "Doe"
        },
        partySize: 2,
        reservationDate: TEST_DATE_STR, 
        startTime: TEST_TIME_STR,
        durationMins: 90
      };

      // 3. Perform booking
      const req = buildPostRequest(URL, payload);
      const res = await POST(req);
      const json = await expectOk<{ id: string }>(res);

      // 4. Verify absolute UTC time stored in DB
      const inDb = await prisma.reservation.findUnique({ where: { id: json.id } });
      expect(inDb).toBeDefined();

      // Asia/Tokyo is JST (UTC+9). 
      // 11:30 JST -> 02:30 UTC
      const expectedUtcTime = `${TEST_DATE_STR}T02:30:00.000Z`;
      
      expect(inDb?.startTime.toISOString()).toBe(expectedUtcTime);
    });
  });

  describe("API Contract Rejections", () => {
    test("should reject startTime formatted as absolute ISO (e.g. includes Z or offset)", async () => {
      const { restaurant } = await seedRestaurantFixture(2, "America/New_York", 1);
      
      const payload = {
        restaurantId: restaurant.id,
        guestId,
        guestData: { firstName: "John", lastName: "Doe" },
        partySize: 2,
        reservationDate: TEST_DATE_STR, 
        // Providing absolute UTC time from client instead of Wall-Clock Intent
        startTime: "2026-10-12T15:30:00.000Z", 
        durationMins: 90
      };

      const req = buildPostRequest(URL, payload);
      const res = await POST(req);
      
      // Should reject because only HH:mm (or HH:mm:ss) string should be allowed.
      await expectStatus(res, 400);
    });

    test("should reject reservationDate formatted as an ISO timestamp", async () => {
        const { restaurant } = await seedRestaurantFixture(2, "America/New_York", 1);
        
        const payload = {
          restaurantId: restaurant.id,
          guestId,
          guestData: { firstName: "John", lastName: "Doe" },
          partySize: 2,
          // Sending a JS date parsed into ISO instead of pure YYYY-MM-DD
          reservationDate: "2026-10-12T04:00:00.000Z", 
          startTime: TEST_TIME_STR,
          durationMins: 90
        };
  
        const req = buildPostRequest(URL, payload);
        const res = await POST(req);
        
        await expectStatus(res, 400);
      });
  });
});
