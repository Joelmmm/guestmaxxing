"use server"

import { revalidatePath } from "next/cache"
import { restaurantSchema, type RestaurantFormValues } from "@/lib/validations/restaurant"
import { updateRestaurant } from "@/lib/services/restaurants"
import { verifyRestaurantAccess } from "@/lib/api-utils"

export async function updateRestaurantAction(restaurantId: string, data: RestaurantFormValues) {
  try {
    // 1. Verify access (must be owner or admin to change settings)
    const access = await verifyRestaurantAccess(restaurantId, ["owner", "admin"])
    if (!access.isAuthorized) {
      return { success: false, error: "Unauthorized" }
    }

    // 2. Validate data
    const validated = restaurantSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, error: "Invalid data", details: validated.error.issues }
    }

    // 3. Update restaurant
    await updateRestaurant(restaurantId, validated.data)

    // 4. Revalidate
    revalidatePath("/dashboard/settings")
    
    return { success: true }
  } catch (error) {
    console.error("[UPDATE_RESTAURANT_ACTION]", error)
    return { success: false, error: "Something went wrong" }
  }
}
