"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, CircleNotch, Plus, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { reservationSchema, type ReservationFormValues } from "@/lib/validations/reservation"

interface DiningArea {
  id: string
  name: string
  tables: {
    id: string
    name: string
    minCapacity: number
    maxCapacity: number
  }[]
}

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  reservation?: any // If provided, we are in edit mode
  onSuccess: () => void
}

export function ReservationDialog({
  open,
  onOpenChange,
  restaurantId,
  reservation,
  onSuccess
}: ReservationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [diningAreas, setDiningAreas] = useState<DiningArea[]>([])
  const [fetchingTables, setFetchingTables] = useState(false)

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema) as any,
    defaultValues: {
      restaurantId,
      guestData: {
        firstName: reservation?.guest?.firstName || "",
        lastName: reservation?.guest?.lastName || "",
        email: reservation?.guest?.email || "",
        phone: reservation?.guest?.phone || "",
      },
      partySize: reservation?.partySize || 2,
      reservationDate: reservation?.reservationDate ? new Date(reservation.reservationDate) : new Date(),
      startTime: reservation?.startTime ? format(new Date(reservation.startTime), "HH:mm") : "19:00",
      endTime: reservation?.endTime ? format(new Date(reservation.endTime), "HH:mm") : "21:00",
      tableIds: reservation?.tables?.map((t: any) => t.tableId) || [],
    },
  })

  useEffect(() => {
    if (open) {
      const fetchTables = async () => {
        setFetchingTables(true)
        try {
          const res = await fetch(`/api/restaurants/${restaurantId}/tables`)
          if (res.ok) {
            const data = await res.ok ? await res.json() : []
            setDiningAreas(data)
          }
        } catch (error) {
          console.error("Failed to fetch tables", error)
        } finally {
          setFetchingTables(false)
        }
      }
      fetchTables()
    }
  }, [open, restaurantId])

  // Reset form when editing a different reservation or opening empty
  useEffect(() => {
    if (open) {
      form.reset({
        restaurantId,
        guestData: {
          firstName: reservation?.guest?.firstName || "",
          lastName: reservation?.guest?.lastName || "",
          email: reservation?.guest?.email || "",
          phone: reservation?.guest?.phone || "",
        },
        partySize: reservation?.partySize || 2,
        reservationDate: reservation?.reservationDate ? new Date(reservation.reservationDate) : new Date(),
        startTime: reservation?.startTime ? format(new Date(reservation.startTime), "HH:mm") : "19:00",
        endTime: reservation?.endTime ? format(new Date(reservation.endTime), "HH:mm") : "21:00",
        tableIds: reservation?.tables?.map((t: any) => t.tableId) || [],
      })
    }
  }, [open, reservation, form])

  const { isSubmitting } = form.formState

  const onSubmit = async (values: ReservationFormValues) => {
    setLoading(true)
    try {
      // Create date-time strings
      const dateStr = format(values.reservationDate, "yyyy-MM-dd")
      const startDateTime = new Date(`${dateStr}T${values.startTime}:00`)
      const endDateTime = new Date(`${dateStr}T${values.endTime}:00`)

      const payload = {
        ...values,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      }

      const url = reservation ? `/api/reservations/${reservation.id}` : `/api/reservations`
      const method = reservation ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(reservation ? "Reservation updated" : "Reservation created")
        onSuccess()
        onOpenChange(false)
      } else {
        const errorText = await response.text()
        if (response.status === 409) {
          form.setError("tableIds", { message: errorText })
        } else {
          toast.error(errorText || "Something went wrong")
        }
      }
    } catch (error) {
      toast.error("Operation failed")
    }
  }

  const toggleTable = (tableId: string) => {
    const current = form.getValues("tableIds")
    if (current.includes(tableId)) {
      form.setValue("tableIds", current.filter(id => id !== tableId))
    } else {
      form.setValue("tableIds", [...current, tableId])
    }
    form.trigger("tableIds")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reservation ? "Edit Reservation" : "New Reservation"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestData.firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestData.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <FormField
                control={form.control}
                name="partySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tableIds"
              render={() => (
                <FormItem>
                  <FormLabel>Table Assignment</FormLabel>
                  <div className="border rounded-md p-4 space-y-4">
                    {fetchingTables ? (
                      <div className="flex items-center justify-center p-4">
                        <CircleNotch className="size-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading tables...</span>
                      </div>
                    ) : diningAreas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">No tables found.</p>
                    ) : (
                      diningAreas.map((area) => (
                        <div key={area.id} className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{area.name}</h4>
                          <div className="flex flex-wrap gap-2">
                            {area.tables.map((table) => (
                              <Badge
                                key={table.id}
                                variant={form.watch("tableIds").includes(table.id) ? "default" : "outline"}
                                className="cursor-pointer transition-colors"
                                onClick={() => toggleTable(table.id)}
                              >
                                {table.name} ({table.minCapacity}-{table.maxCapacity})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <CircleNotch className="size-4 animate-spin mr-2" />}
                {reservation ? "Update Reservation" : "Confirm Reservation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
