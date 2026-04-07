import { expect, test, describe, beforeEach } from "vitest";
import { POST } from "@/app/api/restaurants/route";
import { clearDatabase, prisma } from "@/__tests__/helpers/db";
import { buildPostRequest, expectOk, expectStatus } from "@/__tests__/helpers/request";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_PAYLOAD = {
  name: "New Gourmet Restaurant",
  timezone: "America/New_York",
  contactEmail: "contact@gourmet.com",
  contactPhone: "+1234567890",
  isActive: true,
};

const URL = "http://localhost:3000/api/restaurants";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("POST /api/restaurants", () => {
  beforeEach(clearDatabase);

  test("should create a new restaurant successfully", async () => {
    const req = buildPostRequest(URL, BASE_PAYLOAD);
    const res = await POST(req);

    const json = await expectOk<{ id: string; name: string; slug: string; timezone: string }>(res);

    expect(json.name).toBe(BASE_PAYLOAD.name);
    // slugify("New Gourmet Restaurant") → "new-gourmet-restaurant"
    expect(json.slug).toBe("new-gourmet-restaurant");
    expect(json.timezone).toBe(BASE_PAYLOAD.timezone);

    // Verify persistence
    const inDb = await prisma.restaurant.findUnique({ where: { id: json.id } });
    expect(inDb).toBeDefined();
    expect(inDb?.name).toBe(BASE_PAYLOAD.name);
  });

  test("should handle duplicate slugs by appending a suffix", async () => {
    // Pre-seed a restaurant that will conflict on slug
    await prisma.restaurant.create({
      data: {
        name: "Test Restaurant",
        slug: "test-restaurant",
        contactEmail: "test1@example.com",
        timezone: "UTC",
      },
    });

    const req = buildPostRequest(URL, {
      name: "Test Restaurant",
      timezone: "UTC",
      contactEmail: "test2@example.com",
      isActive: true,
    });

    const res = await POST(req);
    const json = await expectOk<{ slug: string }>(res);
    expect(json.slug).toBe("test-restaurant-1");
  });

  test("should return 400 if name is too short", async () => {
    const req = buildPostRequest(URL, {
      ...BASE_PAYLOAD,
      name: "A",
    });

    const res = await POST(req);
    await expectStatus(res, 400);
  });
});
