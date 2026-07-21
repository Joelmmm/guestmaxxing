"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CaretLeft, CaretRight, CalendarBlank } from "@phosphor-icons/react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { formatInTimeZone } from "date-fns-tz"
import { parseDateForCalendar } from "@/lib/time-utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateStripProps {
  currentDateStr: string;
  restaurantTimezone: string;
}

export function DateStrip({ currentDateStr, restaurantTimezone }: DateStripProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const handleDateChange = (daysToAdd: number) => {
    // Treat the string as absolute noon UTC to safely add/subtract days
    // without any local laptop timezone shifting the boundary.
    const dateObj = new Date(`${currentDateStr}T12:00:00Z`)
    dateObj.setUTCDate(dateObj.getUTCDate() + daysToAdd)
    const newDateStr = dateObj.toISOString().split('T')[0]

    const params = new URLSearchParams(searchParams.toString())
    params.set('date', newDateStr)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setIsPopoverOpen(false)
    if (!date) return;
    
    // The calendar component generates a local `Date`. 
    // We safely parse out exactly what visual date was clicked.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', newDateStr)
    router.push(`${pathname}?${params.toString()}`)
  }

  // To display the date nicely, we parse the "YYYY-MM-DD", 
  // but we use the robust utility that anchors at UTC noon.
  const displayDate = parseDateForCalendar(currentDateStr)
  
  return (
    <div className="flex items-center justify-between border rounded-lg bg-card p-2 shadow-sm">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleDateChange(-1)}
        className="text-muted-foreground"
      >
        <CaretLeft data-icon="inline-start" />
        Prev
      </Button>
      
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 font-medium hover:bg-transparent hover:text-primary">
            <CalendarBlank className="text-muted-foreground size-5" />
            {formatInTimeZone(displayDate, "UTC", "EEE, MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={displayDate}
            defaultMonth={displayDate}
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleDateChange(1)}
        className="text-muted-foreground"
      >
        Next
        <CaretRight data-icon="inline-end" />
      </Button>
    </div>
  )
}
