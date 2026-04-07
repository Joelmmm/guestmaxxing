import { expect, test, describe } from "vitest";
import { GET } from "@/app/api/availability/route";
import { buildGetRequest, expectStatus } from "@/__tests__/helpers/request";

describe("GET /api/availability", () => {
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
});
