import { ReservationsList } from "@/components/dashboard/reservations-list"
import { RestaurantDialog } from "@/components/dashboard/restaurant-dialog"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { Storefront } from "@phosphor-icons/react/dist/ssr"

export default async function ReservationsPage() {
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
            You need to create a restaurant before managing reservations.
          </p>
        </div>
        <RestaurantDialog>
          <Button size="lg" className="px-8">
            Create Restaurant
          </Button>
        </RestaurantDialog>
      </div>
    )
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId: restaurant.id,
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
      startTime: "desc",
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground">
          Manage all guest bookings.
        </p>
      </div>

      <ReservationsList initialData={reservations} restaurantId={restaurant.id} />
    </div>
  )
}
