/**
 * Seed helpers — composable factory functions for common test entities.
 *
 * Each function:
 *   - Accepts an optional `overrides` object for customization.
 *   - Returns the created record (typed by Prisma).
 *   - Depends on `clearDatabase()` having been called in `beforeEach`.
 *
 * Naming convention: `seed<Entity>(overrides?)`
 */
import { prisma } from "@/lib/prisma";
import type {
  Restaurant,
  DiningArea,
  Table,
  Guest,
} from "../../generated/client";

// ---------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------

export async function seedRestaurant(
  overrides: Partial<{
    name: string;
    slug: string;
    timezone: string;
    contactEmail: string;
    contactPhone: string;
    isActive: boolean;
    organizationId: string;
  }> = {}
): Promise<Restaurant> {
  const orgId = overrides.organizationId || "test-org-id";

  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      name: "Test Organization",
      slug: "test-org",
      createdAt: new Date(),
    },
  });

  return prisma.restaurant.create({
    data: {
      name: "Test Restaurant",
      slug: "test-restaurant",
      timezone: "America/Santiago",
      contactEmail: "test@example.com",
      organizationId: orgId,
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Dining Area
// ---------------------------------------------------------------------------

export async function seedDiningArea(
  restaurantId: string,
  overrides: Partial<{ name: string; description: string; isActive: boolean }> = {}
): Promise<DiningArea> {
  return prisma.diningArea.create({
    data: {
      restaurantId,
      name: "Main Room",
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export async function seedTable(
  diningAreaId: string,
  overrides: Partial<{
    name: string;
    minCapacity: number;
    maxCapacity: number;
    isActive: boolean;
  }> = {}
): Promise<Table> {
  return prisma.table.create({
    data: {
      diningAreaId,
      name: "T1",
      minCapacity: 1,
      maxCapacity: 4,
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Guest
// ---------------------------------------------------------------------------

export async function seedGuest(
  overrides: Partial<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    notes: string;
  }> = {}
): Promise<Guest> {
  return prisma.guest.create({
    data: {
      firstName: "Test",
      lastName: "Guest",
      email: "guest@example.com",
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Operating Hours  (full-day slot: 00:00 – 23:59)
// ---------------------------------------------------------------------------

/**
 * Seeds an OperatingHours record with a single all-day slot for the given
 * day of the week (0 = Sunday … 6 = Saturday).  Defaults to Monday (1).
 */
export async function seedOperatingHours(
  restaurantId: string,
  dayOfWeek = 1,
  slots: Array<{ openTime: string; closeTime: string }> = [
    { openTime: "00:00", closeTime: "23:59" },
  ]
) {
  return prisma.operatingHours.create({
    data: {
      restaurantId,
      dayOfWeek,
      slots: { create: slots },
    },
  });
}

// ---------------------------------------------------------------------------
// Full restaurant fixture (restaurant + dining area + N tables + hours)
// ---------------------------------------------------------------------------

export interface RestaurantFixture {
  restaurant: Restaurant;
  diningArea: DiningArea;
  tables: Table[];
}

/**
 * Seeds a complete restaurant fixture ready for reservation tests.
 *
 * @param tableCount   Number of tables to create (default 2)
 * @param timezone     Timezone for operating-hour math (default "America/Santiago")
 * @param dayOfWeek    Day of week to open (default 1 = Monday)
 */
export async function seedRestaurantFixture(
  tableCount = 2,
  timezone = "America/Santiago",
  dayOfWeek = 1
): Promise<RestaurantFixture> {
  const restaurant = await seedRestaurant({ timezone });
  const diningArea = await seedDiningArea(restaurant.id);

  const tables: Table[] = [];
  for (let i = 0; i < tableCount; i++) {
    tables.push(
      await seedTable(diningArea.id, { name: `T${i + 1}` })
    );
  }

  await seedOperatingHours(restaurant.id, dayOfWeek);

  return { restaurant, diningArea, tables };
}
