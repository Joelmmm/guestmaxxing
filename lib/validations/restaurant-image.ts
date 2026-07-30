import * as z from "zod"

export const restaurantImageSchema = z.object({
  altText: z.string().trim().optional(),
  isCover: z.coerce.boolean().optional().default(false),
})

export type RestaurantImageFormValues = z.infer<typeof restaurantImageSchema>
