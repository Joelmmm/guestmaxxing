import { prisma } from "@/lib/prisma"
import type { RestaurantFormValues } from "@/lib/validations/restaurant"

export async function updateRestaurant(id: string, data: Partial<RestaurantFormValues>) {
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
