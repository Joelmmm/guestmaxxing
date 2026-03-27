import * as z from "zod"

export const restaurantSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  contactEmail: z.string().trim().email("Please enter a valid email address."),
  contactPhone: z.string().trim().or(z.literal("")).optional(),
  timezone: z.string().trim().min(1, "Timezone is required"),
  isActive: z.boolean().default(true),
})

export type RestaurantFormValues = z.infer<typeof restaurantSchema>

