import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test and let it override any inherited env vars.
// `override: true` ensures test DB credentials win over production ones.
config({
  path: resolve(process.cwd(), ".env.test"),
  override: true,
});
