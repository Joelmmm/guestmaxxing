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
