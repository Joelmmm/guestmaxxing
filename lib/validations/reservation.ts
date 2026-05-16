import * as z from "zod"

// Plain z.object() — no .refine(), no z.coerce.
// This is required so that useForm<ReservationFormValues> resolves
// Control types correctly with react-hook-form.
// (.refine() and z.coerce wrap the schema in ZodEffects, which
// breaks the Control<TFieldValues> generic type resolution.)
export const reservationSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  guestId: z.string().optional(),
  guestData: z.object({
    firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
    lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.email("Please enter a valid email address."),
    phone: z.string().trim().or(z.literal("")).optional(),
  }),
  partySize: z.number().int().min(1, "Party size must be at least 1 person"),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format, expected HH:MM"),
  durationMins: z.number().int().min(1).default(90).optional(),
  tableIds: z.array(z.string()).optional(),
})

export type ReservationFormValues = z.infer<typeof reservationSchema>
