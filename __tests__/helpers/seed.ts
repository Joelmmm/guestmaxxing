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
import { prisma } from "@/lib/prisma"
import type {
  Restaurant,
  DiningArea,
  Table,
  Guest,
  Reservation,
} from "../../generated/client"
import { TEST_ORGANIZATION_ID, TEST_USER_ID } from "@/__tests__/helpers/auth"

export async function seedTestMembership(
  organizationId = TEST_ORGANIZATION_ID,
  role = "owner"
) {
  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: {
      id: organizationId,
      name: `Test Organization ${organizationId}`,
      slug: `test-org-${organizationId}`,
      createdAt: new Date(),
    },
  })

  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      name: "Test Owner",
      email: "owner@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  const existingMembership = await prisma.member.findFirst({
    where: { userId: TEST_USER_ID, organizationId },
  })

  if (existingMembership) return existingMembership

  return prisma.member.create({
    data: {
      id: `member-${organizationId}`,
      userId: TEST_USER_ID,
      organizationId,
      role,
      createdAt: new Date(),
    },
  })
}

// ---------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------

export async function seedRestaurant(
  overrides: Partial<{
    name: string
    slug: string
    timezone: string
    contactEmail: string
    contactPhone: string
    isActive: boolean
    organizationId: string
    grantAccess: boolean
  }> = {}
): Promise<Restaurant> {
  const {
    organizationId = TEST_ORGANIZATION_ID,
    grantAccess = true,
    ...restaurantOverrides
  } = overrides
  const orgId = organizationId

  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      name: "Test Organization",
      slug: `test-org-${orgId}`,
      createdAt: new Date(),
    },
  })

  if (grantAccess) {
    await seedTestMembership(orgId)
  }

  return prisma.restaurant.create({
    data: {
      name: "Test Restaurant",
      slug: "test-restaurant",
      timezone: "America/Santiago",
      contactEmail: "test@example.com",
      organizationId: orgId,
      ...restaurantOverrides,
    },
  })
}

// ---------------------------------------------------------------------------
// Dining Area
// ---------------------------------------------------------------------------

export async function seedDiningArea(
  restaurantId: string,
  overrides: Partial<{
    name: string
    description: string
    isActive: boolean
  }> = {}
): Promise<DiningArea> {
  return prisma.diningArea.create({
    data: {
      restaurantId,
      name: "Main Room",
      ...overrides,
    },
  })
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export async function seedTable(
  diningAreaId: string,
  overrides: Partial<{
    name: string
    minCapacity: number
    maxCapacity: number
    isActive: boolean
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
  })
}

// ---------------------------------------------------------------------------
// Guest
// ---------------------------------------------------------------------------

export async function seedGuest(
  overrides: Partial<{
    firstName: string
    lastName: string
    email: string | null
    phone: string
    notes: string
  }> = {}
): Promise<Guest> {
  return prisma.guest.create({
    data: {
      firstName: "Test",
      lastName: "Guest",
      email: "guest@example.com",
      ...overrides,
    },
  })
}

// ---------------------------------------------------------------------------
// Reservation
// ---------------------------------------------------------------------------

export async function seedReservation(
  restaurantId: string,
  guestId?: string,
  overrides: Partial<{
    partySize: number
    reservationDate: Date
    startTime: Date
    endTime: Date
    status: Reservation["status"]
  }> = {}
): Promise<Reservation> {
  const startTime = overrides.startTime || new Date("2026-10-12T19:00:00.000Z")

  return prisma.reservation.create({
    data: {
      restaurantId,
      guestId,
      partySize: 2,
      reservationDate:
        overrides.reservationDate || new Date("2026-10-12T00:00:00.000Z"),
      startTime,
      endTime: overrides.endTime || new Date(startTime.getTime() + 90 * 60_000),
      status: overrides.status || "CONFIRMED",
    },
  })
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
  })
}

// ---------------------------------------------------------------------------
// Full restaurant fixture (restaurant + dining area + N tables + hours)
// ---------------------------------------------------------------------------

export interface RestaurantFixture {
  restaurant: Restaurant
  diningArea: DiningArea
  tables: Table[]
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
  const restaurant = await seedRestaurant({ timezone })
  const diningArea = await seedDiningArea(restaurant.id)

  const tables: Table[] = []
  for (let i = 0; i < tableCount; i++) {
    tables.push(await seedTable(diningArea.id, { name: `T${i + 1}` }))
  }

  await seedOperatingHours(restaurant.id, dayOfWeek)

  return { restaurant, diningArea, tables }
}
