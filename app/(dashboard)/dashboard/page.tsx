import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ReservationsList } from "@/components/dashboard/reservations-list"
import { RestaurantDialog } from "@/components/dashboard/restaurant-dialog"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { Storefront } from "@phosphor-icons/react/dist/ssr"

export default async function DashboardPage() {
  // Ideally we'd get the restaurantId from the current user's session/org
  // For now, we'll pick the first one from the DB for demonstration.
  const restaurant = await prisma.restaurant.findFirst()

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center max-w-md mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <Storefront size={40} weight="duotone" className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">No Restaurant Found</h1>
          <p className="text-muted-foreground">
            Get started by creating your first restaurant to manage reservations and tables.
          </p>
        </div>
        <RestaurantDialog>
          <Button size="lg" className="px-8 flex items-center gap-2">
            Create Restaurant
          </Button>
        </RestaurantDialog>
      </div>
    )
  }

  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)

  // Fetch initial data for SSR
  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId: restaurant.id,
      reservationDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      guest: true,
      tables: {
        include: {
          table: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Real-time updates for {restaurant.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RestaurantDialog />
        </div>
      </div>

      <SummaryCards restaurantId={restaurant.id} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Today's Reservations</h2>
        <ReservationsList initialData={reservations} restaurantId={restaurant.id} />
      </div>
    </div>
  )
}
