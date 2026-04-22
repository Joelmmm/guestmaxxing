import { prisma } from "@/lib/prisma"
import { Users, Storefront } from "@phosphor-icons/react/dist/ssr"
import { GuestsList } from "@/components/dashboard/guests/guests-list"
import { GuestDialog } from "@/components/dashboard/guests/guest-dialog"
import { GuestsFilters } from "@/components/dashboard/guests/guests-filters"
import { getOrgRestaurant } from "@/lib/api-utils"
import { Prisma } from "@/generated/client"

export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
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
            You need to create a restaurant before managing your guest directory.
          </p>
        </div>
      </div>
    )
  }

  const { restaurant } = result
  
  // Parse Search Params
  const resolvedSearchParams = await searchParams
  const page = Number(resolvedSearchParams.page) || 1
  const q = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : ""
  const tab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "all"
  
  const take = 15
  const skip = (page - 1) * take

  // Determine Prisma filters based on tab and query
  const where: Prisma.GuestWhereInput = {
    reservations: {
      some: {
        restaurantId: restaurant.id,
      },
    },
    ...(q && {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(tab === "notes" && {
      notes: { not: null },
    }),
  }

  let orderBy: Prisma.GuestOrderByWithRelationInput = { createdAt: "desc" }
  if (tab === "vips") {
    orderBy = { reservations: { _count: "desc" } }
  }

  // Fetch count and paginated data
  const [totalGuests, guests] = await Promise.all([
    prisma.guest.count({ where }),
    prisma.guest.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        _count: {
          select: {
            reservations: true,
          },
        },
      },
    }),
  ])

  const totalPages = Math.ceil(totalGuests / take)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users size={24} weight="duotone" className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Guest Directory</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your customer database, history, and engagement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GuestDialog />
        </div>
      </div>

      <div className="grid gap-4">
        <GuestsFilters currentTab={tab} currentQuery={q} />
        <GuestsList 
          guests={guests} 
          totalPages={totalPages}
          currentPage={page}
        />
      </div>
    </div>
  )
}
