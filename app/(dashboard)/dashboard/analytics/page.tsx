"use client"

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
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const stats = [
  {
    title: "Total Reservations",
    value: "1,284",
    change: "+12.5%",
    trend: "up",
    icon: CalendarCheckIcon,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Average Party Size",
    value: "3.4",
    change: "+2.1%",
    trend: "up",
    icon: UsersIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Peak Hours",
    value: "19:00 - 21:00",
    change: "-4.5%",
    trend: "down",
    icon: ClockIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "Returning Guests",
    value: "24%",
    change: "+3.2%",
    trend: "up",
    icon: TrendUpIcon,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
]

export default function AnalyticsPage() {
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
            <CalendarIcon className="mr-2 h-4 w-4" />
            Last 30 Days
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
                <span className="text-muted-foreground ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-4 border-muted/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ChartLineUpIcon className="mr-2 h-5 w-5 text-blue-500" />
              Reservation Trends
            </CardTitle>
            <CardDescription>
              Number of bookings per day over the last 4 weeks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Custom SVG Chart Placeholder for standard look */}
            <div className="h-[240px] w-full mt-4 bg-muted/20 rounded-lg flex items-end justify-between p-4 overflow-hidden relative">
              <div className="absolute inset-x-0 bottom-0 top-[20%] pointer-events-none opacity-10">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full h-px bg-foreground mb-[20%]" />
                ))}
              </div>
              {[...Array(14)].map((_, i) => (
                <div key={i} className="w-[4%] h-full flex flex-col justify-end gap-1 group cursor-pointer">
                  <div
                    className="w-full bg-blue-500/40 hover:bg-blue-500 transition-all rounded-t-sm"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] shadow-sm whitespace-nowrap z-10 transition-opacity">
                      {Math.floor(Math.random() * 50 + 10)} bookings
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground px-1">
              <span>Mar 12</span>
              <span>Mar 19</span>
              <span>Mar 26</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-muted/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ChartPieIcon className="mr-2 h-5 w-5 text-emerald-500" />
              Area Distribution
            </CardTitle>
            <CardDescription>
              Bookings by dining area today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[240px]">
              <div className="relative size-40 group">
                <svg className="size-full -rotate-90" viewBox="0 0 32 32">
                  <circle r="16" cx="16" cy="16" fill="transparent" stroke="hsl(var(--muted))" strokeWidth="32" />
                  <circle
                    r="16" cx="16" cy="16" fill="transparent" stroke="hsl(var(--primary))" strokeWidth="32" strokeDasharray="65 100"
                    className="transition-all duration-1000 group-hover:opacity-80"
                  />
                  <circle
                    r="16" cx="16" cy="16" fill="transparent" stroke="rgb(16 185 129)" strokeWidth="32" strokeDasharray="30 100" strokeDashoffset="-65"
                    className="transition-all duration-1000 group-hover:opacity-80"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col bg-background rounded-full m-[10%] shadow-inner">
                  <span className="text-2xl font-bold">128</span>
                  <span className="text-[10px] text-muted-foreground">Reservations</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                <div className="flex items-center text-xs">
                  <div className="size-3 rounded-full bg-primary mr-2" />
                  <span className="text-muted-foreground flex-1">Main Room</span>
                  <span className="font-medium">65%</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="size-3 rounded-full bg-emerald-500 mr-2" />
                  <span className="text-muted-foreground flex-1">Terrace</span>
                  <span className="font-medium">30%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-4 border-muted/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <ChartBarIcon className="mr-2 h-5 w-5 text-amber-500" />
              Busiest Days of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {[
                { day: "Saturday", percentage: 95, color: "bg-amber-500" },
                { day: "Friday", percentage: 88, color: "bg-amber-500/80" },
                { day: "Sunday", percentage: 75, color: "bg-amber-500/60" },
                { day: "Thursday", percentage: 62, color: "bg-amber-500/40" },
                { day: "Wednesday", percentage: 45, color: "bg-amber-500/30" },
              ].map((item) => (
                <div key={item.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.day}</span>
                    <span className="text-muted-foreground">{item.percentage}% avg. occupancy</span>
                  </div>
                  <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-muted/40">
          <CardHeader>
            <CardTitle className="text-lg">Recent Feedback</CardTitle>
            <CardDescription>Latest guest ratings and comments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="size-8 rounded-full bg-muted/40 flex items-center justify-center text-xs font-medium">
                    {["JD", "SM", "AL"][i - 1]}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {["Jane Doe", "Sam Miller", "Alex Lee"][i - 1]}
                      </p>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, star) => (
                          <span key={star} className="text-[10px]">★</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "Beautiful atmosphere and the food was incredible. The main room has the best view."
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs hover:bg-muted/30" size="sm">
                View all reviews
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
