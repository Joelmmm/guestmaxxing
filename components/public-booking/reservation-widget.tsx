"use client"

import { useMemo, useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { isBefore, startOfDay } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import {
  getRestaurantTodayForCalendar,
  parseDateForCalendar,
} from "@/lib/time-utils"
import {
  CalendarBlank,
  Clock,
  CheckCircle,
  Spinner,
  ShieldCheck,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import {
  reservationSchema,
  type ReservationFormValues,
} from "@/lib/validations/reservation"
import type { Prisma } from "@/generated/client"
import { cn } from "@/lib/utils"
import { getEffectiveScheduleSlots } from "@/lib/schedule-utils"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OtpStep } from "./otp-step"
import { authClient } from "@/lib/auth-client"
import { upsertGuestForUserAction } from "@/app/actions/guests"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RestaurantWithSchedule = Prisma.RestaurantGetPayload<{
  include: {
    operatingHours: { include: { slots: true } }
    scheduleOverrides: { include: { slots: true } }
  }
}>

/**
 * Widget steps:
 *  setup      → date / party size / time slot selection
 *  guest-info → name / email / phone form
 *  verifying  → OTP step (first-time guest only)
 *  success    → confirmation screen
 */
type Step = "setup" | "guest-info" | "verifying" | "success"

// ---------------------------------------------------------------------------
// Schedule resolution helpers (pure, no API calls)
// ---------------------------------------------------------------------------

function isClosedDay(date: Date, restaurant: RestaurantWithSchedule): boolean {
  const dateStr = formatInTimeZone(date, "UTC", "yyyy-MM-dd")
  const override = restaurant.scheduleOverrides.find(
    (o) =>
      formatInTimeZone(
        new Date(
          `${typeof o.date === "string" ? o.date : (o.date as Date).toISOString().split("T")[0]}T00:00:00.000Z`
        ),
        "UTC",
        "yyyy-MM-dd"
      ) === dateStr
  )

  const [year, month, day] = dateStr.split("-").map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getDay()
  const hours = restaurant.operatingHours.find((h) => h.dayOfWeek === dayOfWeek)

  const effectiveSlots = getEffectiveScheduleSlots(override, hours)
  return !effectiveSlots || effectiveSlots.length === 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReservationWidget({
  restaurant,
}: {
  restaurant: RestaurantWithSchedule
}) {
  const [step, setStep] = useState<Step>("setup")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Tracks whether we've finished the initial session check.
  // Prevents a flash where the widget briefly shows an OTP prompt.
  const [sessionChecked, setSessionChecked] = useState(false)
  // Set to true if getSession() finds a valid session on mount.
  const [hasSession, setHasSession] = useState(false)

  const [, startTransition] = useTransition()

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

  // ── Session check on mount ─────────────────────────────────────────────────
  // Per spec: if the guest already has a valid session, skip the OTP step.
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.session) {
        setHasSession(true)
        // Pre-fill guestData.email from the session user if available
        if (data.user?.email) {
          form.setValue("guestData.email", data.user.email)
        }
        // Populate guestId if the session user has a linked guest
        // (handled server-side during reservation creation via the userId bridge)
      }
      setSessionChecked(true)
    })
  }, [form])

  // ── Slot availability ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchSlots() {
      if (!reservationDate || !partySize) {
        setAvailableSlots([])
        return
      }

      setIsLoadingSlots(true)
      try {
        const res = await fetch(
          `/api/availability/public?slug=${restaurant.slug}&date=${reservationDate}&partySize=${partySize}`
        )
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
  }, [reservationDate, partySize, restaurant.slug])

  const selectedSlot = startTime

  function handleSlotSelect(slot: string) {
    if (!reservationDate) return
    form.setValue("startTime", slot, { shouldValidate: true })
    form.setValue("durationMins", 90)
  }

  async function handleNext() {
    const valid = await form.trigger([
      "reservationDate",
      "partySize",
      "startTime",
    ])
    if (valid) setStep("guest-info")
  }

  // ── Called when the guest-info form is complete ────────────────────────────
  // If the guest has a session → submit directly.
  // If not → go to OTP verification first.
  async function handleGuestInfoNext() {
    const valid = await form.trigger([
      "guestData.firstName",
      "guestData.lastName",
      "guestData.email",
    ])
    if (!valid) return

    const email = form.getValues("guestData.email")

    // Returning guest with session: skip OTP entirely
    if (hasSession) {
      await submitReservation()
      return
    }

    // First-time guest: move to OTP step
    setStep("verifying")
  }

  // ── Called by OtpStep on successful verification ───────────────────────────
  // Step 5 in the spec: upsert the Guest record linked to the new User.
  // Then submit the reservation with the resolved guestId.
  async function handleOtpVerified(userId: string) {
    startTransition(async () => {
      const guestData = form.getValues("guestData")

      const result = await upsertGuestForUserAction({
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        phone: guestData.phone,
      })

      if (!result.success || !result.guestId) {
        toast.error("Could not link your account. Please try again.")
        setStep("guest-info")
        return
      }

      // Stamp guestId onto the form so the reservation service uses it directly
      form.setValue("guestId", result.guestId)
      setHasSession(true)
      await submitReservation()
    })
  }

  // ── Core reservation submission ────────────────────────────────────────────
  async function submitReservation() {
    setIsSubmitting(true)
    try {
      const data = form.getValues()
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
        form.setError("tableIds", {
          type: "manual",
          message:
            "No tables available for this time. Please choose a different slot.",
        })
        setStep("setup")
        return
      }

      const text = await res.text()
      toast.error(text || "Something went wrong. Please try again.")
      setStep("guest-info")
    } catch {
      toast.error("Could not reach the server. Please try again.")
      setStep("guest-info")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onSubmit(data: ReservationFormValues) {
    // This fires from the form's native submit (guest-info step confirm button).
    // We intercept it via handleGuestInfoNext instead of letting it fall through,
    // but keeping onSubmit wired for the returning-guest direct path.
    void data // consumed by submitReservation via form.getValues()
    await handleGuestInfoNext()
  }

  const today = getRestaurantTodayForCalendar(restaurant.timezone)

  // Friendly summary displayed in headers and the success screen
  const selectionSummary =
    reservationDate && selectedSlot
      ? `${formatInTimeZone(new Date(`${reservationDate}T12:00:00.000Z`), "UTC", "MMMM d")} at ${selectedSlot} · ${form.getValues("partySize")} ${form.getValues("partySize") === 1 ? "person" : "people"}`
      : null

  // ── Step descriptions ──────────────────────────────────────────────────────
  const stepDescription = {
    setup: "Choose your date, party size, and time.",
    "guest-info": selectionSummary ?? "Enter your contact details.",
    verifying: "Check your email for a verification code.",
    success: "Your reservation is confirmed!",
  }[step]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Make a Reservation</CardTitle>
            <CardDescription>{stepDescription}</CardDescription>
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
                              {field.value
                                ? formatInTimeZone(
                                    parseDateForCalendar(field.value),
                                    "UTC",
                                    "PPP"
                                  )
                                : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value
                                ? parseDateForCalendar(field.value)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(
                                  formatInTimeZone(date, "UTC", "yyyy-MM-dd")
                                )
                                form.setValue("startTime", "")
                              } else {
                                field.onChange("")
                              }
                            }}
                            disabled={(date) =>
                              isBefore(startOfDay(date), today) ||
                              isClosedDay(date, restaurant)
                            }
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
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(
                            (n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n} {n === 1 ? "person" : "people"}
                              </SelectItem>
                            )
                          )}
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
                          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
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
                                variant={
                                  selectedSlot === slot ? "default" : "outline"
                                }
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
                {/* Session badge for returning guests */}
                {hasSession && (
                  <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 shrink-0 text-green-500" />
                    <span>Verified — no code needed this time.</span>
                  </div>
                )}

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
                        {hasSession ? null : (
                          <span className="font-normal text-muted-foreground">
                            (used to verify your booking)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          {...field}
                          // Prevent editing if email comes from session
                          readOnly={hasSession}
                          className={
                            hasSession ? "cursor-default bg-muted" : undefined
                          }
                        />
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
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 555 000 0000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ── STEP 3: OTP Verification (first-time guest only) ── */}
            {step === "verifying" && (
              <OtpStep
                email={form.getValues("guestData.email") || ""}
                firstName={form.getValues("guestData.firstName")}
                lastName={form.getValues("guestData.lastName")}
                onVerified={handleOtpVerified}
                onBack={() => setStep("guest-info")}
              />
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle className="size-16 text-green-500" weight="fill" />
                <p className="font-medium">Reservation confirmed</p>
                {selectionSummary && (
                  <p className="text-sm text-muted-foreground">
                    {selectionSummary}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  The restaurant will reach out if anything changes.
                </p>
                <Button asChild>
                  <Link type="button" href="/manage" className="">
                    Manage your reservations
                  </Link>
                </Button>
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
              <Button
                type="button"
                onClick={handleGuestInfoNext}
                disabled={isSubmitting || !sessionChecked}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 animate-spin" />
                    Confirming…
                  </>
                ) : hasSession ? (
                  "Confirm Reservation"
                ) : (
                  "Continue"
                )}
              </Button>
            )}
            {/* No footer buttons during OTP or success steps */}
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
