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
}).refine(
  (data) => {
    if (data.slots.length <= 1) return true;
    
    // Check for overlapping slots
    // Sort slots by start time
    const sortedSlots = [...data.slots].sort((a, b) => {
      const startA = parseInt(a.openTime.replace(":", ""), 10);
      const startB = parseInt(b.openTime.replace(":", ""), 10);
      return startA - startB;
    });

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const current = sortedSlots[i];
      const next = sortedSlots[i + 1];
      
      const currentEnd = parseInt(current.closeTime.replace(":", ""), 10);
      const nextStart = parseInt(next.openTime.replace(":", ""), 10);
      
      if (currentEnd > nextStart) {
        return false; // Overlap found
      }
    }
    return true;
  },
  {
    message: "Time slots cannot overlap",
    path: ["slots"],
  }
);


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
