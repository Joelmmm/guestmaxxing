import { vi } from "vitest"
import { auth } from "@/lib/auth"

export const TEST_USER_ID = "test-user-id"
export const TEST_ORGANIZATION_ID = "test-org-id"

const now = new Date()

export const TEST_SESSION = {
  session: {
    id: "test-session-id",
    token: "test-session-token",
    userId: TEST_USER_ID,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    ipAddress: null,
    userAgent: null,
    activeOrganizationId: TEST_ORGANIZATION_ID,
  },
  user: {
    id: TEST_USER_ID,
    name: "Test Owner",
    email: "owner@example.com",
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  },
} as Awaited<ReturnType<typeof auth.api.getSession>>

export function mockAuthenticatedSession() {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(TEST_SESSION)
}

export function mockUnauthenticatedSession() {
  vi.mocked(auth.api.getSession).mockResolvedValue(null)
}
