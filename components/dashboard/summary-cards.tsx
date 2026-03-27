"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  Table as TableIcon 
} from "@phosphor-icons/react"
import { useEffect, useState } from "react"

interface Stats {
  total: number
  confirmed: number
  arrived: number
  seated: number
  completed: number
}

interface Occupancy {
  total: number
  occupied: number
}

export function SummaryCards({ restaurantId }: { restaurantId: string }) {
  const [data, setData] = useState<{ stats: Stats; occupancy: Occupancy } | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/dashboard/stats?restaurantId=${restaurantId}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("Failed to fetch stats", err)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [restaurantId])

  if (!data) return null

  const cards = [
    {
      title: "Today's Bookings",
      value: data.stats.total,
      description: `${data.stats.confirmed} confirmed`,
      icon: CalendarCheck,
      color: "text-blue-500",
    },
    {
      title: "Arrived",
      value: data.stats.arrived,
      description: `${data.stats.seated} seated`,
      icon: Users,
      color: "text-emerald-500",
    },
    {
      title: "Upcoming",
      value: data.stats.confirmed,
      description: "Next 2 hours",
      icon: Clock,
      color: "text-amber-500",
    },
    {
      title: "Table Occupancy",
      value: `${data.occupancy.occupied}/${data.occupancy.total}`,
      description: `${Math.round((data.occupancy.occupied / data.occupancy.total) * 100)}% full`,
      icon: TableIcon,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="shadow-sm border-muted/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon data-icon="inline-start" className={`size-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
