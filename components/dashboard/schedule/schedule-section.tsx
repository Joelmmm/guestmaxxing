"use client"

import { cn } from "@/lib/utils"
import * as React from "react"
import { ScheduleProvider } from "./schedule-context"
import { ScheduleList } from "./schedule-list"
import { OverridesCard } from "./overrides-card"
import { OperatingHoursFormValues } from "@/lib/validations/operating-hours"

interface ScheduleSectionProps {
  restaurantId: string
  restaurantTimezone: string
  initialData: OperatingHoursFormValues[]
  initialOverrides?: any[]
  className?: string
  canManage?: boolean
}

export function ScheduleSection({ restaurantId, restaurantTimezone, initialData, initialOverrides = [], className, canManage = false }: ScheduleSectionProps) {
  // Ensure dates are strings for the client components
  const formattedOverrides = initialOverrides.map(override => ({
    ...override,
    date: override.date instanceof Date 
      ? override.date.toISOString().split('T')[0] 
      : typeof override.date === 'string' 
        ? override.date.split('T')[0] 
        : override.date
  }))

  return (
    <ScheduleProvider restaurantId={restaurantId} restaurantTimezone={restaurantTimezone} initialData={initialData} initialOverrides={formattedOverrides}>
      <div className={cn("space-y-6", className)}>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Operation & Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Manage your weekly opening hours and special day overrides.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 w-full overflow-hidden mb4-">
            <ScheduleList canManage={canManage} />
          </div>
          <OverridesCard canManage={canManage} />
        </div>
      </div>
    </ScheduleProvider>
  )
}
