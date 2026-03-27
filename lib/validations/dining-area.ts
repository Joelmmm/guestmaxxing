import * as z from "zod"

export const diningAreaSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  description: z.string().trim().or(z.literal("")).optional(),
})

export type DiningAreaFormValues = z.infer<typeof diningAreaSchema>

