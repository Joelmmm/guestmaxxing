"use client"

import * as React from "react"
import { useSchedule } from "./schedule-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Plus, Trash, WarningCircle, Clock } from "@phosphor-icons/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item"
import { format, addDays, isSameDay } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { parseDateForCalendar, getRestaurantTodayStr } from "@/lib/time-utils"
import { DateRange } from "react-day-picker"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardAction,
} from "@/components/ui/card"

interface OverridesCardProps {
  canManage?: boolean
}

export function OverridesCard({ canManage = false }: OverridesCardProps) {
  const { overrides, setSelectedOverrideDate, setView, onRemoveOverride, restaurantTimezone } = useSchedule()

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            Schedule Overrides
          </CardTitle>
          {canManage && <AddOverrideDialog />}
        </div>
        <CardDescription>
          Holidays, events, or emergency closures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-2">
          {overrides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 border border-dashed rounded-xl bg-muted/10 text-muted-foreground">
              <WarningCircle className="size-8 opacity-20 mb-2" />
              <p className="text-xs">
                No overrides scheduled. Click "+" to add one.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {overrides
                .sort((a, b) => new Date(`${a.date}T00:00:00.000Z`).getTime() - new Date(`${b.date}T00:00:00.000Z`).getTime())
                .map((override, index) => (
                  <OverrideItem
                    key={index}
                    override={override}
                    canManage={canManage}
                    onRemove={() => onRemoveOverride(index)}
                    onClick={() => {
                      setSelectedOverrideDate(override.date)
                      setView("override")
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AddOverrideDialog() {
  const [range, setRange] = React.useState<DateRange | undefined>()
  const [isClosed, setIsClosed] = React.useState(false)
  const [slots, setSlots] = React.useState<any[]>([{ openTime: "09:00", closeTime: "17:00" }])
  const { onAddOverride, overrides, restaurantTimezone } = useSchedule()
  const [open, setOpen] = React.useState(false)

  const handleAddSlot = () => setSlots([...slots, { openTime: "09:00", closeTime: "17:00" }])
  const handleRemoveSlot = (idx: number) => setSlots(slots.filter((_, i) => i !== idx))
  const handleUpdateSlot = (idx: number, field: string, value: string) => {
    setSlots(slots.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const handleSave = () => {
    if (!range?.from) return

    const selectedDates: Date[] = []
    let currentDate = range.from
    const endDate = range.to || range.from

    while (currentDate <= endDate) {
      selectedDates.push(new Date(currentDate))
      currentDate = addDays(currentDate, 1)
    }

    selectedDates.forEach(date => {
      // Avoid duplicates for the same date if needed, or update existing
      const dateString = format(date, "yyyy-MM-dd")
      const existing = overrides.find(o => o.date === dateString)
      if (!existing) {
        onAddOverride({
          date: dateString,
          isClosed,
          slots: isClosed ? [] : slots
        })
      }
    })

    setOpen(false)
    setRange(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" >
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="" style={{ maxWidth: 'fit-content' }}>
        <DialogHeader>
          <DialogTitle>Add Override</DialogTitle>
        </DialogHeader>
        <div className="flex md:flex-row flex-col justify-center gap-6 ">
          <div className="flex flex-col gap-2">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={(date) => date < parseDateForCalendar(getRestaurantTodayStr(restaurantTimezone))}
            />
            <caption className="text-xs text-muted-foreground font-light text-center">Select Date or Range</caption>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
              <div className="space-y-1">
                <Label htmlFor="is-closed" className="text-base">Closed All Day</Label>
                <p className="text-xs text-muted-foreground">
                  Mark the selected dates as fully closed.
                </p>
              </div>
              <Switch id="is-closed" checked={isClosed} onCheckedChange={setIsClosed} />
            </div>

            {!isClosed && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                      <Clock className="size-4" /> Time Slots
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Define the open hours for the override.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleAddSlot}>
                    <Plus className="size-3.5" />
                    <span>Add Slot</span>
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  {slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Input
                        type="time"
                        className="w-[130px] shadow-sm"
                        value={slot.openTime}
                        onChange={(e) => handleUpdateSlot(idx, "openTime", e.target.value)}
                      />
                      <span className="text-muted-foreground text-sm font-medium">to</span>
                      <Input
                        type="time"
                        className="w-[130px] shadow-sm"
                        value={slot.closeTime}
                        onChange={(e) => handleUpdateSlot(idx, "closeTime", e.target.value)}
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemoveSlot(idx)}>
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {slots.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md bg-muted/10">
                      No time slots added.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!range?.from}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OverrideItem({ override, canManage, onRemove, onClick }: { override: any; canManage?: boolean; onRemove: () => void; onClick: () => void }) {
  const dateStr = formatInTimeZone(new Date(`${override.date}T00:00:00.000Z`), "UTC", "MMM d")

  return (
    <Item variant="outline" size="xs" onClick={onClick} className="w-fit cursor-pointer hover:bg-muted/50 transition-colors">
      <ItemContent >
        <ItemTitle >
          {dateStr}
        </ItemTitle>
        <ItemDescription className="line-clamp-none">
          {override.isClosed ? (
            <span className="text-destructive">Closed</span>
          ) : (
            override.slots?.length > 0 ? (
              override.slots.map((slot: any, i: number) => (
                <span key={i} className="block whitespace-nowrap">
                  {slot.openTime} - {slot.closeTime}
                </span>
              ))
            ) : "No slots"
          )}
        </ItemDescription>
      </ItemContent>
      {canManage && (
        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash />
          </Button>
        </ItemActions>
      )}
    </Item>
  )
}
