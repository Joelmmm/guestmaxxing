import { ScheduleSection } from "@/components/dashboard/schedule/schedule-section"
import { SettingsForm } from "@/components/dashboard/settings-form"
import { Storefront, CalendarSlash } from "@phosphor-icons/react/dist/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getOrgRestaurant, getServerRestaurantAccess } from "@/lib/api-utils"

export default async function RestaurantPage() {
  const result = await getOrgRestaurant({
    operatingHours: {
      include: {
        slots: true,
      },
    },
    scheduleOverrides: {
      include: {
        slots: true,
      },
    },
  })

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center max-w-md mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <Storefront size={40} weight="duotone" className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">No Restaurant Found</h1>
          <p className="text-muted-foreground">
            You need to create a restaurant first to access this page.
          </p>
        </div>
      </div>
    )
  }

  const { restaurant } = result
  const { canManage, isOwner } = await getServerRestaurantAccess(restaurant.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Restaurant Profile</h1>
        <p className="text-muted-foreground">
          Update your restaurant's details, operating hours, and preferences.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <div className="md:col-span-2 lg:col-span-3 space-y-8">
          <SettingsForm restaurant={restaurant} className="w-full" canManage={canManage} />

          <Separator />

          <ScheduleSection
            restaurantId={restaurant.id}
            restaurantTimezone={restaurant.timezone}
            initialData={restaurant.operatingHours as any}
            initialOverrides={restaurant.scheduleOverrides as any}
            canManage={canManage}
          />
        </div>

        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${restaurant.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  <p className="text-sm">{restaurant.isActive ? "Active" : "Inactive"}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Online Bookings</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${restaurant.isAcceptingReservations ? "bg-green-500" : "bg-amber-500"}`} />
                  <p className="text-sm">{restaurant.isAcceptingReservations ? "Accepting Reservations" : "Paused"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <CalendarSlash size={20} />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  Actions that cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button className="text-sm text-destructive hover:underline font-medium">
                  Deactivate {restaurant.name}
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
