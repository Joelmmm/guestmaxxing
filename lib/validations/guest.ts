import * as z from "zod"

export const guestSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters."),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid email address.").or(z.literal("")).optional(),
  phone: z.string().trim().or(z.literal("")).optional(),
  notes: z.string().trim().or(z.literal("")).optional(),
})

export type GuestFormValues = z.infer<typeof guestSchema>

