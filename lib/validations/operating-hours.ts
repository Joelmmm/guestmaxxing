import * as z from "zod"

export const timeSlotSchema = z
  .object({
    openTime: z
      .string()
      .trim()
      .min(5, "Format: HH:mm")
      .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Must be HH:mm"),
    closeTime: z
      .string()
      .trim()
      .min(5, "Format: HH:mm")
      .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Must be HH:mm"),
  })
  .refine(
    (data) => {
      const start = parseInt(data.openTime.replace(":", ""), 10)
      const end = parseInt(data.closeTime.replace(":", ""), 10)
      return end > start
    },
    {
      message: "Close time must be after open time",
      path: ["closeTime"],
    }
  )

export const operatingHoursSchema = z.object({
  dayOfWeek: z.coerce.number().min(0).max(6),
  slots: z.array(timeSlotSchema).min(1, "At least one time slot is required"),
})

export const scheduleOverrideSchema = z
  .object({
    date: z.coerce.date(),
    isClosed: z.boolean().default(false),
    slots: z.array(timeSlotSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (!data.isClosed && (!data.slots || data.slots.length === 0)) {
        return false
      }
      return true
    },
    {
      message: "At least one time slot is required if the restaurant is not closed",
      path: ["slots"],
    }
  )

export type OperatingHoursFormValues = z.infer<typeof operatingHoursSchema>
export type ScheduleOverrideFormValues = z.infer<typeof scheduleOverrideSchema>
export type TimeSlotFormValues = z.infer<typeof timeSlotSchema>
