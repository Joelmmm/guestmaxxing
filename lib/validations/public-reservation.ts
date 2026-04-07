import * as z from "zod"

export const publicReservationSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant selection."),
  partySize: z.coerce.number().min(1, "Party size must be at least 1.").max(20, "For parties larger than 20, please contact the restaurant directly."),
  reservationDate: z.coerce.date({
    error: "Please select a valid date.",
  } as any),
  startTime: z.string().datetime({ message: "Invalid start time." }),
  // Guest Data (Required for public bookings)
  guestData: z.object({
    firstName: z.string().trim().min(2, "First name is required."),
    lastName: z.string().trim().min(2, "Last name is required."),
    email: z.string().trim().email("Please enter a valid email address."),
    phone: z.string().trim().min(5, "Please enter a valid phone number."),
  }),
  specialRequest: z.string().trim().max(500, "Special requests must be under 500 characters.").optional().or(z.literal("")),
})

export type PublicReservationFormValues = z.infer<typeof publicReservationSchema>
