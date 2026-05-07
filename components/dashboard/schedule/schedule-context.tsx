"use client"

import * as React from "react"
import { toast } from "sonner"
import { OperatingHoursFormValues, TimeSlotFormValues } from "@/lib/validations/operating-hours"

interface ScheduleContextType {
  // Data
  data: OperatingHoursFormValues[]
  overrides: any[] // TODO: Define precise override type
  
  // Selection/Interaction State
  activeDay: number | null
  setActiveDay: (day: number | null) => void
  
  // Handlers
  onAddSlot: (day: number, slot: TimeSlotFormValues) => void
  onRemoveSlot: (day: number, slotIndex: number) => void
  onUpdateSlot: (day: number, slotIndex: number, slot: TimeSlotFormValues) => void
  onToggleDay: (day: number) => void

  // Overrides Handlers
  onAddOverride: (override: any) => void
  onRemoveOverride: (index: number) => void
  onUpdateOverride: (index: number, override: any) => void
  
  // View Mode
  view: "weekly" | "override"
  setView: (view: "weekly" | "override") => void
  selectedOverrideDate: Date | null
  setSelectedOverrideDate: (date: Date | null) => void

  // Restaurant
  restaurantTimezone: string

  // Save State
  isDirty: boolean
  isPending: boolean
  saveHours: () => Promise<void>
}

const ScheduleContext = React.createContext<ScheduleContextType | undefined>(undefined)

export function ScheduleProvider({ 
  children,
  restaurantId,
  restaurantTimezone,
  initialData,
  initialOverrides = []
}: { 
  children: React.ReactNode
  restaurantId: string
  restaurantTimezone: string
  initialData: OperatingHoursFormValues[]
  initialOverrides?: any[]
}) {
  const [data, setData] = React.useState<OperatingHoursFormValues[]>(initialData)
  const [savedData, setSavedData] = React.useState<OperatingHoursFormValues[]>(initialData)
  const [overrides, setOverrides] = React.useState<any[]>(initialOverrides)
  const [savedOverrides, setSavedOverrides] = React.useState<any[]>(initialOverrides)
  const [activeDay, setActiveDay] = React.useState<number | null>(null)
  const [view, setView] = React.useState<"weekly" | "override">("weekly")
  const [selectedOverrideDate, setSelectedOverrideDate] = React.useState<Date | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  const isDirty = React.useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(savedData) || JSON.stringify(overrides) !== JSON.stringify(savedOverrides)
  }, [data, savedData, overrides, savedOverrides])

  const saveHours = async () => {
    if (!isDirty) return
    setIsPending(true)
    try {
      const validData = data.filter(d => d.slots && d.slots.length > 0)
      
      const payload = {
        type: "SCHEDULE_BATCH",
        data: {
          hours: validData,
          overrides: overrides
        }
      }
      
      const response = await fetch(`/api/restaurants/${restaurantId}/operating-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to save schedule")
      
      setSavedData(data)
      setSavedOverrides(overrides)
      toast.success("Schedule updated successfully")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save schedule")
    } finally {
      setIsPending(false)
    }
  }

  const onAddSlot = (day: number, slot: TimeSlotFormValues) => {
    setData(prev => {
      const exists = prev.find(d => d.dayOfWeek === day)
      if (exists) {
        return prev.map(d => (d.dayOfWeek === day ? { ...d, slots: [...d.slots, slot] } : d))
      }
      return [...prev, { dayOfWeek: day, slots: [slot] }]
    })
  }

  const onRemoveSlot = (day: number, slotIndex: number) => {
    setData(prev => prev.map(d => {
      if (d.dayOfWeek === day) {
        const newSlots = d.slots.filter((_, i) => i !== slotIndex)
        return { ...d, slots: newSlots }
      }
      return d
    }))
  }

  const onUpdateSlot = (day: number, slotIndex: number, newSlot: TimeSlotFormValues) => {
    setData(prev => prev.map(d => {
      if (d.dayOfWeek === day) {
        const newSlots = [...d.slots]
        newSlots[slotIndex] = newSlot
        return { ...d, slots: newSlots }
      }
      return d
    }))
  }

  const onToggleDay = (day: number) => {
    // Basic implementation: if 0 slots, maybe add a default 9-5 or something
    // For now, it's a placeholder for more complex logic
  }

  const onAddOverride = (override: any) => {
    setOverrides(prev => [...prev, override])
  }

  const onRemoveOverride = (index: number) => {
    setOverrides(prev => prev.filter((_, i) => i !== index))
  }

  const onUpdateOverride = (index: number, newOverride: any) => {
    setOverrides(prev => {
      const next = [...prev]
      next[index] = newOverride
      return next
    })
  }

  return (
    <ScheduleContext.Provider value={{
      data,
      overrides,
      activeDay,
      setActiveDay,
      onAddSlot,
      onRemoveSlot,
      onUpdateSlot,
      onToggleDay,
      onAddOverride,
      onRemoveOverride,
      onUpdateOverride,
      view,
      setView,
      selectedOverrideDate,
      setSelectedOverrideDate,
      isDirty,
      isPending,
      saveHours,
      restaurantTimezone,
    }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  const context = React.useContext(ScheduleContext)
  if (!context) throw new Error("useSchedule must be used within a ScheduleProvider")
  return context
}
