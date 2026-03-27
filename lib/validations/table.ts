import * as z from "zod"

export const tableSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    minCapacity: z.coerce.number().int().min(1, "Must be at least 1 person."),
    maxCapacity: z.coerce.number().int().min(1, "Must be at least 1 person."),
    diningAreaId: z.string().min(1, "Dining area is required."),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.maxCapacity >= data.minCapacity, {
    message: "Max capacity must be greater than or equal to min capacity.",
    path: ["maxCapacity"],
  })

export type TableFormValues = z.infer<typeof tableSchema>

