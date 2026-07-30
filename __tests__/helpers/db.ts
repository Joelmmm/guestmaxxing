/**
 * DB test helpers — shared across all API test suites.
 *
 * Import order for `deleteMany` matters: remove leaf records first,
 * then work up to the root (Restaurant) to avoid FK constraint errors.
 */
import { prisma } from "@/lib/prisma";

export { prisma };

/**
 * Wipes every application table in the correct FK order.
 * Call this in `beforeEach` for full isolation between tests.
 */
export async function clearDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Safety guard: clearDatabase() can only be run when NODE_ENV === 'test'."
    );
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("placeholder")) {
    throw new Error(
      "Safety guard: DATABASE_URL in .env.test is not set or contains placeholders. Please set a dedicated test database URL in .env.test."
    );
  }

  await prisma.reservationOnTable.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.table.deleteMany();
  await prisma.diningArea.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.operatingHours.deleteMany();
  await prisma.scheduleOverride.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.restaurant.deleteMany();
}
