import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    // Runs before each test file; loads .env.test so DATABASE_URL
    // points to the test database instead of production.
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share a single PostgreSQL test database.
    // Running files in parallel causes clearDatabase() in one file
    // to wipe rows that another file just seeded → FK violations.
    fileParallelism: false,
  },
});
