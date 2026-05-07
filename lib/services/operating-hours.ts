import { prisma } from '@/lib/prisma'
import { OperatingHoursFormValues, ScheduleOverrideFormValues } from '@/lib/validations/operating-hours'

/**
 * Service Layer for Operating Hours & Schedule Overrides
 * All DB interactions and business logic live here; API routes are thin controllers.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Midnight UTC for a given YYYY-MM-DD string — used for @db.Date comparisons. */
function utcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/** Today's date as a YYYY-MM-DD string (UTC), for consistent "future-only" filters. */
function todayUtcStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSchedule(restaurantId: string) {
  const [hours, overrides] = await Promise.all([
    prisma.operatingHours.findMany({
      where: { restaurantId },
      include: { slots: true },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.scheduleOverride.findMany({
      where: {
        restaurantId,
        date: { gte: utcMidnight(todayUtcStr()) },
      },
      include: { slots: true },
      orderBy: { date: 'asc' },
    }),
  ])

  return { hours, overrides }
}

// ---------------------------------------------------------------------------
// Mutations — Single Entity
// ---------------------------------------------------------------------------

export async function upsertOperatingHours(
  restaurantId: string,
  data: OperatingHoursFormValues
) {
  const { dayOfWeek, slots } = data

  return prisma.operatingHours.upsert({
    where: { restaurantId_dayOfWeek: { restaurantId, dayOfWeek } },
    update: {
      slots: {
        deleteMany: {},
        create: slots,
      },
    },
    create: {
      restaurantId,
      dayOfWeek,
      slots: { create: slots },
    },
    include: { slots: true },
  })
}

export async function upsertScheduleOverride(
  restaurantId: string,
  data: ScheduleOverrideFormValues
) {
  const { date, isClosed, slots } = data

  // date is a Date object after z.coerce.date() — normalise to UTC midnight for storage
  const dateStr =
    date instanceof Date
      ? date.toISOString().split('T')[0]
      : String(date).split('T')[0]

  const dbDate = utcMidnight(dateStr)
  const slotData = isClosed ? [] : (slots ?? [])

  return prisma.scheduleOverride.upsert({
    where: { restaurantId_date: { restaurantId, date: dbDate } },
    update: {
      isClosed,
      slots: {
        deleteMany: {},
        create: slotData,
      },
    },
    create: {
      restaurantId,
      date: dbDate,
      isClosed,
      slots: { create: slotData },
    },
    include: { slots: true },
  })
}

// ---------------------------------------------------------------------------
// Mutations — Batch Save (full schedule replacement)
// ---------------------------------------------------------------------------

export async function saveScheduleBatch(
  restaurantId: string,
  hours: OperatingHoursFormValues[],
  overrides: ScheduleOverrideFormValues[]
) {
  // Normalise override dates to UTC midnight Date objects before the transaction
  const normalisedOverrides = overrides.map((o) => {
    const dateStr =
      o.date instanceof Date
        ? o.date.toISOString().split('T')[0]
        : String(o.date).split('T')[0]
    return { ...o, dbDate: utcMidnight(dateStr) }
  })

  const todayUtc = utcMidnight(todayUtcStr())

  await prisma.$transaction([
    // Replace all operating-hour rows
    prisma.operatingHours.deleteMany({ where: { restaurantId } }),

    // Delete only current + future overrides (keep historical records)
    prisma.scheduleOverride.deleteMany({
      where: { restaurantId, date: { gte: todayUtc } },
    }),

    // Re-create hours
    ...hours.map((h) =>
      prisma.operatingHours.create({
        data: {
          restaurantId,
          dayOfWeek: h.dayOfWeek,
          slots: { create: h.slots },
        },
      })
    ),

    // Re-create overrides
    ...normalisedOverrides.map((o) =>
      prisma.scheduleOverride.create({
        data: {
          restaurantId,
          date: o.dbDate,
          isClosed: o.isClosed,
          slots: { create: o.isClosed ? [] : (o.slots ?? []) },
        },
      })
    ),
  ])

  // Return the fresh state after the batch
  return getSchedule(restaurantId)
}
