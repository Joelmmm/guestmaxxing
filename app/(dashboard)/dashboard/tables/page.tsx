import { TableStatus } from "@/components/dashboard/table-status"
import { RestaurantDialog } from "@/components/dashboard/restaurant-dialog"
import { DiningAreaDialog } from "@/components/dashboard/dining-area-dialog"
import { Button } from "@/components/ui/button"
import { Storefront, Plus, Layout } from "@phosphor-icons/react/dist/ssr"
import { getOrgRestaurant, getServerRestaurantAccess } from "@/lib/api-utils"

export default async function TablesPage() {
  const result = await getOrgRestaurant({
    diningAreas: {
      select: {
        id: true,
        name: true,
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
            You need to create a restaurant before managing tables and layouts.
          </p>
        </div>
        <RestaurantDialog>
          <Button size="lg" className="px-8 font-semibold">
            Create Restaurant
          </Button>
        </RestaurantDialog>
      </div>
    )
  }

  const { restaurant } = result
  const { canManage } = await getServerRestaurantAccess(restaurant.id)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Tables &amp; Layout
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your restaurant areas and table configurations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <DiningAreaDialog restaurantId={restaurant.id}>
              <Button variant="outline" className="h-11 px-5 border-2 hover:bg-muted font-semibold transition-all">
                <Layout className="mr-2 size-5" />
                New Area
              </Button>
            </DiningAreaDialog>
          )}
        </div>
      </div>

      <div className="bg-muted/30 rounded-3xl p-8 border border-muted/50">
        <TableStatus restaurantId={restaurant.id} canManage={canManage} />
      </div>
    </div>
  )
}
