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

export function OverridesCard() {
  const { overrides, setSelectedOverrideDate, setView, onRemoveOverride, restaurantTimezone } = useSchedule()

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            Schedule Overrides
          </CardTitle>
          <AddOverrideDialog />
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
      const existing = overrides.find(o => isSameDay(new Date(o.date), date))
      if (!existing) {
        onAddOverride({
          date,
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
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>Add Override</DialogTitle>
        </DialogHeader>
        <div className="flex gap-10" >
          <div >
            <span >Select Date or Range</span>
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={(date) => date < parseDateForCalendar(getRestaurantTodayStr(restaurantTimezone))}
            />
          </div>
          <div >
            <div >
              <Label htmlFor="is-closed" >Closed All Day</Label>
              <Switch id="is-closed" checked={isClosed} onCheckedChange={setIsClosed} />
            </div>

            {!isClosed && (
              <div >
                <div >
                  <span >
                    <Clock /> Time Slots
                  </span>
                  <Button variant="ghost" size="icon" onClick={handleAddSlot}>
                    <Plus />
                  </Button>
                </div>
                <div >
                  {slots.map((slot, idx) => (
                    <div key={idx} >
                      <Input
                        type="time"
                        value={slot.openTime}
                        onChange={(e) => handleUpdateSlot(idx, "openTime", e.target.value)}
                      />
                      <span >-</span>
                      <Input
                        type="time"
                        value={slot.closeTime}
                        onChange={(e) => handleUpdateSlot(idx, "closeTime", e.target.value)}

                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(idx)}>
                        <Trash />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter >
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!range?.from}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OverrideItem({ override, onRemove, onClick }: { override: any; onRemove: () => void; onClick: () => void }) {
  const dateStr = formatInTimeZone(new Date(`${override.date}T00:00:00.000Z`), "UTC", "MMM d")

  return (
    <Item variant="outline" size="xs" onClick={onClick}>
      <ItemContent >
        <ItemTitle >
          {dateStr}
        </ItemTitle>
        <ItemDescription >
          {override.isClosed ? (
            <span >Closed</span>
          ) : (
            override.slots?.length > 0 ? (
              `${override.slots[0].openTime}...`
            ) : "No slots"
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions >
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
    </Item>
  )
}
