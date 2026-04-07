import * as z from "zod"

export const guestSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters."),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters."),
  email: z.union([z.literal(""), z.string().email("Please enter a valid email address.")]).optional(),
  phone: z.string().trim().or(z.literal("")).optional(),
  notes: z.string().trim().or(z.literal("")).optional(),
})

export type GuestFormValues = z.infer<typeof guestSchema>

