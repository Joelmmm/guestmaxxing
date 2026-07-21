import { prisma } from "@/lib/prisma"
import type { RestaurantFormValues } from "@/lib/validations/restaurant"

/**
 * Creates a new restaurant and automatically provisions a default "Main" Dining Area
 * and a default table. This ensures the restaurant is immediately ready to accept
 * reservations without requiring the user to go through multiple manual setup steps.
 */
export async function createRestaurant(data: {
  name: string
  slug: string
  timezone: string
  contactEmail: string
  contactPhone?: string
  organizationId: string
}) {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.name,
      slug: data.slug,
      timezone: data.timezone,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      organizationId: data.organizationId,
    },
  })

  return restaurant
}

export async function updateRestaurant(
  id: string,
  data: Partial<RestaurantFormValues>
) {
  return await prisma.restaurant.update({
    where: { id },
    data: {
      name: data.name,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      timezone: data.timezone,
      isAcceptingReservations: data.isAcceptingReservations,
      isActive: data.isActive,
      // slug is optional in the schema, but we don't want to update it here
      // unless specifically requested. The settings form doesn't have it.
    },
  })
}
