
"use client"

import * as React from "react"
import { useSchedule } from "./schedule-context"
import { Button } from "@/components/ui/button"
import { Plus, Trash } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"

const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
]

interface ScheduleListProps {
    canManage?: boolean
}

export function ScheduleList({ canManage = false }: ScheduleListProps) {
    const { data, onAddSlot, onRemoveSlot, onUpdateSlot, isDirty, isPending, saveHours } = useSchedule()

    // Ensure all 7 days are represented
    const fullWeekData = React.useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const dayData = data.find(d => d.dayOfWeek === i)
            return dayData || { dayOfWeek: i, slots: [] }
        })
    }, [data])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Weekly Schedule</h3>
                {canManage && (
                    <Button 
                        onClick={saveHours} 
                        disabled={!isDirty || isPending}
                        size="sm"
                    >
                        {isPending ? "Saving..." : "Save Changes"}
                    </Button>
                )}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {fullWeekData.map((day) => (
                    <div
                        key={day.dayOfWeek}
                        className="group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 border border-border"
                    >
                        <div className="group/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold leading-snug">{DAYS[day.dayOfWeek]}</h3>
                                {canManage && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => onAddSlot(day.dayOfWeek, { openTime: "09:00", closeTime: "17:00" })}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="px-4">
                            <div className="space-y-2">
                                {day.slots.map((slot, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-md">
                                        <div className="flex items-center gap-1 flex-1">
                                            <Input
                                                type="time"
                                                value={slot.openTime}
                                                onChange={(e) => onUpdateSlot(day.dayOfWeek, idx, { ...slot, openTime: e.target.value })}
                                                className="h-8 w-fit border-none bg-transparent p-0 text-xs tabular-nums focus-visible:ring-0"
                                                readOnly={!canManage}
                                            />
                                            <span className="text-muted-foreground">-</span>
                                            <Input
                                                type="time"
                                                value={slot.closeTime}
                                                onChange={(e) => onUpdateSlot(day.dayOfWeek, idx, { ...slot, closeTime: e.target.value })}
                                                className="h-8 w-fit border-none bg-transparent p-0 text-xs tabular-nums focus-visible:ring-0"
                                                readOnly={!canManage}
                                            />
                                        </div>
                                        {canManage && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => onRemoveSlot(day.dayOfWeek, idx)}
                                            >
                                                <Trash className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {day.slots.length === 0 && (
                                <p className="text-xs text-muted-foreground italic py-2">Closed</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}



