import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendUpIcon,
  UsersIcon,
  CalendarCheckIcon,
  ClockIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  ChartPieIcon,
  CalendarIcon,
} from "@phosphor-icons/react/dist/ssr"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getOrgRestaurant } from "@/lib/api-utils"
import { getDashboardStats } from "@/lib/analytics/stats"
import { getReservationTrends } from "@/lib/analytics/trends"
import { ReservationTrendsChart } from "@/components/analytics/reservation-trends-chart"
import { Storefront } from "@phosphor-icons/react/dist/ssr"

export default async function AnalyticsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const daysParam = typeof searchParams.days === 'string' ? parseInt(searchParams.days) : 30;

  const result = await getOrgRestaurant();
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center max-w-md mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <Storefront size={40} weight="duotone" className="text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">No Restaurant Found</h1>
          <p className="text-muted-foreground">
            Get started by creating your first restaurant to manage analytics.
          </p>
        </div>
      </div>
    )
  }

  const { restaurant } = result;

  // Fetch real stats
  const data = await getDashboardStats(restaurant.id, daysParam);
  const trendsData = await getReservationTrends(restaurant.id, restaurant.timezone, daysParam);

  const stats = [
    {
      title: "Total Reservations",
      value: data.totalReservations.value,
      change: `${data.totalReservations.change > 0 ? '+' : ''}${data.totalReservations.change}%`,
      trend: data.totalReservations.change >= 0 ? "up" : "down",
      icon: CalendarCheckIcon,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Average Party Size",
      value: data.averagePartySize.value,
      change: `${data.averagePartySize.change > 0 ? '+' : ''}${data.averagePartySize.change}%`,
      trend: data.averagePartySize.change >= 0 ? "up" : "down",
      icon: UsersIcon,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Peak Hours",
      value: data.peakHours.value,
      change: `${data.peakHours.change > 0 ? '+' : ''}${data.peakHours.change}%`,
      trend: data.peakHours.change >= 0 ? "up" : "down",
      icon: ClockIcon,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Returning Guests",
      value: data.returningGuests.value,
      change: `${data.returningGuests.change > 0 ? '+' : ''}${data.returningGuests.change}%`,
      trend: data.returningGuests.change >= 0 ? "up" : "down",
      icon: TrendUpIcon,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Analytics</h2>
          <p className="text-muted-foreground">
            Overview of your restaurant's performance and reservation trends.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <CalendarIcon data-icon="inline-start" />
            Last {daysParam} Days
          </Button>
          <Button size="sm">Download Report</Button>
        </div>
      </div>
      <Separator className="bg-muted/40" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="overflow-hidden border-muted/40 transition-all hover:shadow-md group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center pt-1 text-xs">
                <span className={stat.trend === "up" ? "text-emerald-500 flex items-center" : "text-rose-500 flex items-center"}>
                  {stat.trend === "up" ? <ArrowUpRightIcon className="mr-1 h-3 w-3" /> : <ArrowDownRightIcon className="mr-1 h-3 w-3" />}
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-1">
                  from previous {daysParam} days
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="w-full">
        <Card className="md:col-span-4 border-muted/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ChartLineUpIcon className="mr-2 h-5 w-5 text-blue-500" />
              Reservation Trends
            </CardTitle>
            <CardDescription>
              Number of bookings per day over the last {daysParam} days.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px]">
            <ReservationTrendsChart data={trendsData} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
