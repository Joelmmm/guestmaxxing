import * as z from "zod"

export const reservationSchema = z
  .object({
    restaurantId: z.string().min(1, "Restaurant ID is required"),
    guestId: z.string().optional(),
    guestData: z.object({
      firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
      lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
      email: z.string().trim().email("Please enter a valid email address.").or(z.literal("")).optional(),
      phone: z.string().trim().min(5, "Phone number is required").or(z.literal("")).optional(),
    }),
    partySize: z.coerce.number().int().positive("Party size must be at least 1 person"),
    reservationDate: z.coerce.date({
      error: "A valid date of reservation is required.",
    }),

    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    tableIds: z.array(z.string()).min(1, "Select at least one table"),
  })
  .refine(
    (data) => {
      const start = new Date(`1970-01-01T${data.startTime}:00`)
      const end = new Date(`1970-01-01T${data.endTime}:00`)
      return end > start
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  )

export type ReservationFormValues = z.infer<typeof reservationSchema>

