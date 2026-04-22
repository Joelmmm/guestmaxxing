"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CaretUpDown, Plus, Buildings } from "@phosphor-icons/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CreateOrganizationForm } from "@/components/organization/create-organization-form"
import { Skeleton } from "@/components/ui/skeleton"

// Get the type of the active organization and the list of organizations
const useOrganizations = () => {
  const router = useRouter()
  const { data: activeOrg, isPending: isActivePending } = authClient.useActiveOrganization()
  const { data: orgs, isPending: isListPending } = authClient.useListOrganizations()

  const isPending = isActivePending || isListPending

  // Auto-select the first org when the session has no active org set.
  // Better Auth persists activeOrganizationId server-side, so this only
  // fires on first login or after a stale session — never on subsequent loads.
  React.useEffect(() => {
    if (!isPending && !activeOrg && orgs && orgs.length > 0) {
      authClient.organization.setActive({ organizationId: orgs[0].id }).then(() => {
        router.refresh()
      })
    }
  }, [isPending, activeOrg, orgs, router])

  return { activeOrg, orgs, isPending }
}

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { activeOrg, orgs, isPending } = useOrganizations()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Skeleton className="size-8 rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const handleOrgChange = async (organizationId: string) => {
    if (activeOrg?.id === organizationId) return

    await authClient.organization.setActive({
      organizationId,
    })
    
    // Hard navigate to refresh data since context changed
    window.location.href = "/dashboard"
  }

  const handleCreateSuccess = async (organizationId: string) => {
    setIsDialogOpen(false)
    await authClient.organization.setActive({
      organizationId,
    })
    
    window.location.href = "/dashboard"
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Buildings size={20} weight="fill" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeOrg?.name || "No Workspace"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Admin Dashboard
                  </span>
                </div>
                <CaretUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>
              {orgs?.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleOrgChange(org.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Buildings className="size-4 shrink-0" />
                  </div>
                  {org.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem className="gap-2 p-2 cursor-pointer">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Create Workspace</div>
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new top-level container for your restaurant locations.
          </DialogDescription>
        </DialogHeader>
        <CreateOrganizationForm onSuccess={handleCreateSuccess} onCancel={() => setIsDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
