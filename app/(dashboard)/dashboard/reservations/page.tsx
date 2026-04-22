import { ReservationsList } from "@/components/dashboard/reservations-list"
import { RestaurantDialog } from "@/components/dashboard/restaurant-dialog"
import { PublicLinkMenu } from "@/components/dashboard/public-link-menu"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { getOrgRestaurant } from "@/lib/api-utils"
import { getRestaurantTodayStr, toRestaurantDateFilter } from "@/lib/time-utils"
import { Storefront } from "@phosphor-icons/react/dist/ssr"

export default async function ReservationsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const dateParam = typeof searchParams.date === 'string' ? searchParams.date : undefined;
  const result = await getOrgRestaurant()

  if (!result) {
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

  const { restaurant } = result

  // 1. Determine "Today" safely using the business timezone
  const defaultDateStr = getRestaurantTodayStr(restaurant.timezone)
  const targetDateStr = dateParam || defaultDateStr

  // 2. Safely parse it for the Prisma @db.Date column
  const dateFilter = toRestaurantDateFilter(targetDateStr)

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId: restaurant.id,
      reservationDate: dateFilter,
    },
    include: {
      restaurant: { select: { timezone: true } },
      guest: true,
      tables: {
        include: {
          table: { select: { name: true } },
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
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">
            Manage all guest bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PublicLinkMenu restaurantSlug={restaurant.slug} />
        </div>
      </div>

      <ReservationsList 
        initialData={reservations} 
        restaurantId={restaurant.id} 
        restaurantTimezone={restaurant.timezone} 
        currentDateStr={targetDateStr}
      />
    </div>
  )
}
