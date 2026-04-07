import { prisma } from "@/lib/prisma"
import { ScheduleSection } from "@/components/dashboard/schedule/schedule-section"
import { SettingsForm } from "@/components/dashboard/settings-form"
import { Storefront, CalendarSlash } from "@phosphor-icons/react/dist/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function SettingsPage() {
  const restaurant = await prisma.restaurant.findFirst({
    include: {
      operatingHours: {
        include: {
          slots: true
        }
      },
      scheduleOverrides: {
        include: {
          slots: true
        }
      }
    }
  })

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center max-w-md mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <Storefront size={40} weight="duotone" className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">No Restaurant Found</h1>
          <p className="text-muted-foreground">
            You need to create a restaurant first to access settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Update your restaurant's details and preferences.
        </p>
      </div>

      <div className="">
        <div className="md:col-span-2 lg:col-span-3 space-y-8">
          <SettingsForm restaurant={restaurant} className="w-full" />

          <Separator />

          <ScheduleSection
            restaurantId={restaurant.id}
            restaurantTimezone={restaurant.timezone}
            initialData={restaurant.operatingHours as any}
            initialOverrides={restaurant.scheduleOverrides as any}
          />
        </div>

        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Restaurant ID</p>
                <p className="text-sm font-mono break-all">{restaurant.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${restaurant.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  <p className="text-sm">{restaurant.isActive ? "Active" : "Inactive"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  )
}
