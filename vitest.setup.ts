import { config } from "dotenv";
import { resolve } from "path";

// Vitest automatically sets NODE_ENV to "test"

// Load .env.test and let it override any inherited env vars.
// `override: true` ensures test DB credentials win over production ones.
config({
  path: resolve(process.cwd(), ".env.test"),
  override: true,
});

