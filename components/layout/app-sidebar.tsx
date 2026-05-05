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
  StorefrontIcon,
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

const navGroups = [
  {
    label: "Operations",
    items: [
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
        title: "Tables",
        url: "/dashboard/tables",
        icon: TableIcon,
      },
      {
        title: "Guests",
        url: "/dashboard/guests",
        icon: UsersIcon,
      },
    ],
  },
  {
    label: "Management",
    items: [
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
        title: "Restaurant",
        url: "/dashboard/restaurant",
        icon: StorefrontIcon,
      },
    ],
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
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}
      </SidebarContent>
      <SidebarFooter>
        {/* You can add user profile switch here later */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
