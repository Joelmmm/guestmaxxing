import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ReservationWidget } from "@/components/public-booking/reservation-widget"
import { Metadata } from "next"

interface ReservePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ReservePageProps): Promise<Metadata> {
  const { slug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
  })

  if (!restaurant) return { title: "Restaurant Not Found" }

  return {
    title: `Book a table at ${restaurant.name}`,
    description: `Make a reservation at ${restaurant.name} online. Quick, easy, and confirmed instantly.`,
  }
}

export default async function ReservePage({ params }: ReservePageProps) {
  const { slug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      operatingHours: {
        include: { slots: true }
      },
      scheduleOverrides: {
        include: { slots: true }
      }
    }
  })

  if (!restaurant || !restaurant.isActive) {
    return notFound()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in duration-700">
        <header className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-zinc-400 text-lg">Secure your table in seconds.</p>
        </header>

        <ReservationWidget restaurant={restaurant} />

        <footer className="text-center text-zinc-600 text-sm py-4">
          Powered by Reserva &bull; 2026
        </footer>
      </div>
    </div>
  )
}
