import { prisma } from "@/lib/prisma"
import { Users } from "@phosphor-icons/react/dist/ssr"
import { GuestsList } from "@/components/dashboard/guests/guests-list"
import { GuestDialog } from "@/components/dashboard/guests/guest-dialog"

export default async function GuestsPage() {
  // Fetch all guests with their reservation counts
  const guests = await prisma.guest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          reservations: true,
        },
      },
    },
  })

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
        <GuestsList initialData={guests} />
      </div>
    </div>
  )
}
