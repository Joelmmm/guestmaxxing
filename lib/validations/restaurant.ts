import * as z from "zod"

export const restaurantSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  slug: z.string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens.")
    .optional()
    .or(z.literal("")),
  contactEmail: z.string().email("Please enter a valid email address."),
  contactPhone: z.string().trim().or(z.literal("")).optional(),
  timezone: z.string().trim().min(1, "Timezone is required"),
  isActive: z.boolean(),
  isAcceptingReservations: z.boolean(),
})

export type RestaurantFormValues = z.infer<typeof restaurantSchema>

