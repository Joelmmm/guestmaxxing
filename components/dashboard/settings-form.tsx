"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Restaurant } from "@/generated/client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { restaurantSchema, type RestaurantFormValues } from "@/lib/validations/restaurant"
import { cn } from "@/lib/utils"

interface SettingsFormProps {
  restaurant: Restaurant
  className?: string
  canManage?: boolean
}

export function SettingsForm({ restaurant, className, canManage = false }: SettingsFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: restaurant.name || "",
      contactEmail: restaurant.contactEmail || "",
      contactPhone: restaurant.contactPhone || "",
      timezone: restaurant.timezone || "America/Santiago",
      isAcceptingReservations: restaurant.isAcceptingReservations ?? true,
    },
  })

  async function onSubmit(values: RestaurantFormValues) {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error("Failed to update restaurant")
      }

      toast.success("Settings updated successfully")
      router.refresh()
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Manage your restaurant's profile and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restaurant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="The French Laundry" disabled={!canManage} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@restaurant.com" type="email" disabled={!canManage} {...field} />
                  </FormControl>
                  <FormDescription>
                    Used for notifications and system alerts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" disabled={!canManage} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canManage}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="America/Santiago">America/Santiago (Chile)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This affects how reservations and operating hours are displayed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAcceptingReservations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Accepting Reservations</FormLabel>
                    <FormDescription>
                      Temporarily disable this to stop receiving new online bookings.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canManage}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {canManage && (
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>

  )
}
