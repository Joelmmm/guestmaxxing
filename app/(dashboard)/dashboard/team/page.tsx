import { getOrgMembership } from "@/lib/api-utils"
import { TeamManager } from "@/components/dashboard/team/team-manager"
import { ShieldSlash } from "@phosphor-icons/react/dist/ssr"

export default async function TeamPage() {
  const membership = await getOrgMembership()

  if (!membership || !membership.canManage) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center max-w-md mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10">
          <ShieldSlash size={40} weight="duotone" className="text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to view or manage the team.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage staff members, roles, and invitations for your organization.
        </p>
      </div>

      <TeamManager isOwner={membership.isOwner} canManage={membership.canManage} />
    </div>
  )
}
