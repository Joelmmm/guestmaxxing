"use client"

import { useMemo, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isBefore, startOfDay } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { getRestaurantTodayStr, parseDateForCalendar, getRestaurantTodayForCalendar } from "@/lib/time-utils"
import { CalendarBlank, Clock, CheckCircle, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"
import { reservationSchema, type ReservationFormValues } from "@/lib/validations/reservation"
import type { Prisma } from "@/generated/client"
import { cn } from "@/lib/utils"
import { getTurnTime, getEffectiveScheduleSlots, generateAvailableTimeSlots } from "@/lib/schedule-utils"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RestaurantWithSchedule = Prisma.RestaurantGetPayload<{
  include: {
    operatingHours: { include: { slots: true } }
    scheduleOverrides: { include: { slots: true } }
  }
}>

type Step = "setup" | "guest-info" | "success"

// ---------------------------------------------------------------------------
// Schedule resolution helpers (pure, no API calls)
// ---------------------------------------------------------------------------

function isClosedDay(date: Date, restaurant: RestaurantWithSchedule): boolean {
  const dateStr = formatInTimeZone(date, "UTC", "yyyy-MM-dd")
  const override = restaurant.scheduleOverrides.find(
    (o) => formatInTimeZone(new Date(`${typeof o.date === 'string' ? o.date : (o.date as Date).toISOString().split('T')[0]}T00:00:00.000Z`), "UTC", "yyyy-MM-dd") === dateStr
  )
  
  const [year, month, day] = dateStr.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getDay()
  const hours = restaurant.operatingHours.find((h) => h.dayOfWeek === dayOfWeek)

  const effectiveSlots = getEffectiveScheduleSlots(override, hours)
  return !effectiveSlots || effectiveSlots.length === 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReservationWidget({ restaurant }: { restaurant: RestaurantWithSchedule }) {
  const [step, setStep] = useState<Step>("setup")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      restaurantId: restaurant.id,
      partySize: 2,
      guestData: { firstName: "", lastName: "", email: "", phone: "" },
    },
  })

  const reservationDate = form.watch("reservationDate")
  const startTime = form.watch("startTime")
  const partySize = form.watch("partySize")

  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  useEffect(() => {
    async function fetchSlots() {
      if (!reservationDate || !partySize) {
        setAvailableSlots([])
        return
      }

      setIsLoadingSlots(true)
      try {
        const res = await fetch(`/api/availability/public?slug=${restaurant.slug}&date=${reservationDate}&partySize=${partySize}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableSlots(data.availableSlots || [])
        } else {
          setAvailableSlots([])
        }
      } catch (err) {
        console.error("Failed to fetch availability", err)
        setAvailableSlots([])
      } finally {
        setIsLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [reservationDate, partySize, restaurant.id])

  const selectedSlot = startTime

  function handleSlotSelect(slot: string) {
    if (!reservationDate) return
    form.setValue("startTime", slot, { shouldValidate: true })
    form.setValue("durationMins", 90)
  }

  async function handleNext() {
    const valid = await form.trigger(["reservationDate", "partySize", "startTime"])
    if (valid) setStep("guest-info")
  }

  async function onSubmit(data: ReservationFormValues) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setStep("success")
        return
      }

      if (res.status === 409) {
        // Map conflict to the time-slot field so the user knows to pick differently
        form.setError("tableIds", {
          type: "manual",
          message: "No tables available for this time. Please choose a different slot.",
        })
        setStep("setup")
        return
      }

      const text = await res.text()
      toast.error(text || "Something went wrong. Please try again.")
    } catch {
      toast.error("Could not reach the server. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const today = getRestaurantTodayForCalendar(restaurant.timezone)

  // Friendly summary of the selected slot for the guest-info step header
  const selectionSummary =
    reservationDate && selectedSlot
      ? `${formatInTimeZone(new Date(`${reservationDate}T12:00:00.000Z`), "UTC", "MMMM d")} at ${selectedSlot} · ${form.getValues("partySize")} ${form.getValues("partySize") === 1 ? "person" : "people"}`
      : null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Make a Reservation</CardTitle>
            <CardDescription>
              {step === "setup" && "Choose your date, party size, and time."}
              {step === "guest-info" &&
                (selectionSummary ?? "Enter your contact details.")}
              {step === "success" && "Your reservation is confirmed!"}
            </CardDescription>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">

            {/* ── STEP 1: Setup ── */}
            {step === "setup" && (
              <div className="flex flex-col gap-6">

                {/* Date picker */}
                <FormField
                  control={form.control}
                  name="reservationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarBlank data-icon="inline-start" />
                              {field.value ? formatInTimeZone(parseDateForCalendar(field.value), "UTC", "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseDateForCalendar(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(formatInTimeZone(date, "UTC", "yyyy-MM-dd"))
                                form.setValue("startTime", "")
                              } else {
                                field.onChange("")
                              }
                            }}
                            disabled={(date) =>
                              isBefore(startOfDay(date), today) ||
                              isClosedDay(date, restaurant)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Party size */}
                <FormField
                  control={form.control}
                  name="partySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party size</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="How many guests?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} {n === 1 ? "person" : "people"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time slots */}
                {reservationDate && (
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={() => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Clock />
                          Available times
                        </FormLabel>
                        {isLoadingSlots ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <Spinner className="animate-spin" />
                            Checking table availability...
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No available times for this date.
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {availableSlots.map((slot) => (
                              <Button
                                key={slot}
                                type="button"
                                variant={selectedSlot === slot ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSlotSelect(slot)}
                              >
                                {slot}
                              </Button>
                            ))}
                          </div>
                        )}
                        {/* tableIds error surfaces here (409 conflict from API) */}
                        <FormField
                          control={form.control}
                          name="tableIds"
                          render={() => <FormMessage />}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* ── STEP 2: Guest info ── */}
            {step === "guest-info" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guestData.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guestData.lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="guestData.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jane@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guestData.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Phone{" "}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+1 555 000 0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle className="size-12 text-green-500" weight="fill" />
                <p className="font-medium">Reservation confirmed</p>
                {selectionSummary && (
                  <p className="text-sm text-muted-foreground">{selectionSummary}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  The restaurant will reach out if anything changes.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {step === "guest-info" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("setup")}
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <span />
            )}

            {step === "setup" && (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            )}
            {step === "guest-info" && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Confirming…" : "Confirm Reservation"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
