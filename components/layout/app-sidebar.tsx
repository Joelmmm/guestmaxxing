"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SquaresFourIcon,
  CalendarIcon,
  UsersIcon,
  TableIcon,
  ChartLineUpIcon,
  GearIcon,
  UsersThreeIcon
} from "@phosphor-icons/react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { OrganizationSwitcher } from "@/components/organization/organization-switcher"

const items = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: SquaresFourIcon,
  },
  {
    title: "Reservations",
    url: "/dashboard/reservations",
    icon: CalendarIcon,
  },
  {
    title: "Guests",
    url: "/dashboard/guests",
    icon: UsersIcon,
  },
  {
    title: "Tables",
    url: "/dashboard/tables",
    icon: TableIcon,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: ChartLineUpIcon,
  },
  {
    title: "Team",
    url: "/dashboard/team",
    icon: UsersThreeIcon,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: GearIcon,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon size={20} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/* You can add user profile switch here later */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
