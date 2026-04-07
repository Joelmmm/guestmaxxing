import { z } from "zod"

export const availabilitySchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD"),
  time: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format. Expected HH:mm"),
  partySize: z.coerce.number().int().positive().min(1, "Party size must be at least 1")
})

export type AvailabilityRequest = z.infer<typeof availabilitySchema>
