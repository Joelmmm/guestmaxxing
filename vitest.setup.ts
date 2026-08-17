import { config } from "dotenv"
import { resolve } from "path"
import { beforeEach, vi } from "vitest"

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Vitest automatically sets NODE_ENV to "test"

// Load .env.test and let it override any inherited env vars.
// `override: true` ensures test DB credentials win over production ones.
config({
  path: resolve(process.cwd(), ".env.test"),
  override: true,
})

const { mockAuthenticatedSession } = await import("./__tests__/helpers/auth")

beforeEach(() => {
  mockAuthenticatedSession()
})
