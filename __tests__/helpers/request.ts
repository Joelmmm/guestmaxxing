/**
 * HTTP / assertion helpers — shared across all API test suites.
 *
 * Design goals:
 *  - Prevent the `res.text()` + `res.json()` double-consume footgun.
 *  - Keep `NextRequest` construction DRY.
 *  - Surface error payloads in assertion failure messages automatically.
 */
import { NextRequest } from "next/server";
import { expect } from "vitest";

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

export function buildPostRequest(url: string, payload: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function buildGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

// ---------------------------------------------------------------------------
// Response assertion helpers
// ---------------------------------------------------------------------------

/**
 * Asserts the response has status 200 and returns the parsed JSON body.
 * On failure the raw response text is included in the assertion message
 * so the error is visible without extra console.log calls.
 *
 * @example
 * const json = await expectOk(res);
 * expect(json.name).toBe("My Restaurant");
 */
export async function expectOk<T = unknown>(res: Response): Promise<T> {
  if (!res.ok) {
    // Clone so the body can be consumed for the error message without
    // exhausting the original stream (though we won't use res again).
    const text = await res.clone().text();
    expect(res.status, `Expected 200 but got ${res.status}: ${text}`).toBe(200);
  }
  return res.json() as Promise<T>;
}

/**
 * Asserts the response has a specific status code.
 * Includes the response body in the assertion message on failure.
 */
export async function expectStatus(
  res: Response,
  status: number
): Promise<void> {
  const text = res.status !== status ? await res.clone().text() : "";
  expect(
    res.status,
    text ? `Expected ${status} but got ${res.status}: ${text}` : undefined
  ).toBe(status);
}
