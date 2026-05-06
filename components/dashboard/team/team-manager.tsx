"use client"

import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Trash, LinkBreak } from "@phosphor-icons/react"

export function TeamManager({ isOwner, canManage }: { isOwner: boolean; canManage: boolean }) {
  const [data, setData] = useState<{ members: any[], invitations: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  const fetchTeamData = async () => {
    try {
      const { data: orgData, error } = await authClient.organization.getFullOrganization()
      if (error) throw error
      if (orgData) {
        setData({ members: orgData.members, invitations: orgData.invitations })
      }
    } catch (e: any) {
      toast.error("Failed to load team data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [])

  const handleGenerateInvite = async () => {
    if (!inviteEmail) return
    try {
      const { data, error } = await authClient.organization.inviteMember({
        email: inviteEmail,
        role: inviteRole as any,
      })
      if (error) {
        toast.error("Failed to send invitation", { description: error.message })
        return
      }
      fetchTeamData()
      setIsInviteDialogOpen(false)
      setInviteEmail("")
      toast.success(`Invitation sent to ${inviteEmail}`)
    } catch (err: any) {
      toast.error("Error", { description: err.message })
    }
  }

  const handleUpdateRole = async (memberId: string, role: string) => {
    const { error } = await authClient.organization.updateMemberRole({ memberId, role: role as any })
    if (error) {
      toast.error("Failed to update role", { description: error.message })
    } else {
      toast.success("Role updated successfully")
      fetchTeamData()
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return
    const { error } = await authClient.organization.removeMember({ memberIdOrEmail: memberId })
    if (error) {
      toast.error("Failed to remove member", { description: error.message })
    } else {
      toast.success("Member removed successfully")
      fetchTeamData()
    }
  }
  
  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return
    const { error } = await authClient.organization.cancelInvitation({ invitationId: inviteId })
    if (error) {
        toast.error("Failed to cancel invitation", { description: error.message })
    } else {
        toast.success("Invitation canceled")
        fetchTeamData()
    }
  }

  if (isLoading) return <div className="text-muted-foreground animate-pulse">Loading team data...</div>
  if (!data) return <div className="text-muted-foreground">Unable to fetch organization details.</div>

  const { members, invitations } = data

  return (
    <div className="space-y-8">
      {/* Active Members Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Active Members</CardTitle>
            <CardDescription>View and manage current organization members.</CardDescription>
          </div>
          {canManage && (
            <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
              setIsInviteDialogOpen(open)
              if (!open) setInviteEmail("")
            }}>
              <DialogTrigger asChild>
                <Button>Invite Staff</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Member</DialogTitle>
                  <DialogDescription>
                    Generate a shareable link for your new staff member to join.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input 
                      placeholder="employee@restaurant.com" 
                      value={inviteEmail} 
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member (View & manage reservations)</SelectItem>
                        <SelectItem value="admin">Admin (Manage settings & staff)</SelectItem>
                        {isOwner && <SelectItem value="owner">Owner (Full access)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button className="w-full" onClick={handleGenerateInvite} disabled={!inviteEmail}>
                    Send Invitation Email
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.user?.name || "Member"}</span>
                      <span className="text-sm text-muted-foreground">{member.user?.email || member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select 
                        defaultValue={member.role}
                        onValueChange={(val) => handleUpdateRole(member.id, val)}
                        disabled={member.role === 'owner' && !isOwner}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue className="capitalize" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && !(member.role === 'owner' && !isOwner) && (
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveMember(member.id)}>
                        <Trash size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    No members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invitations Card */}
      {canManage && invitations.length > 0 && (
          <Card>
            <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invitations awaiting acceptance.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invitations.filter((i: any) => i.status === "pending").map((invite: any) => (
                            <TableRow key={invite.id}>
                                <TableCell className="font-medium">{invite.email}</TableCell>
                                <TableCell className="capitalize">{invite.role}</TableCell>
                                <TableCell>
                                    <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2 py-1 rounded-full font-medium">
                                        Pending
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)} className="text-destructive">
                                        <LinkBreak size={14} className="mr-2" />
                                        Revoke
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
      )}
    </div>
  )
}
