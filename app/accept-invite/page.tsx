import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Storefront } from "@phosphor-icons/react/dist/ssr"
import { AcceptInviteClient } from "./accept-invite-client"

export default async function AcceptInvitePage(
  props: { searchParams: Promise<{ id?: string }> }
) {
  const searchParams = await props.searchParams
  const id = searchParams.id

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>Missing invitation ID in the URL.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 1. Check if they are logged in at all
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    // If not, send them to sign-up and pass 'returnTo' so they come right back here
    const returnUrl = encodeURIComponent(`/accept-invite?id=${id}`)
    redirect(`/sign-up?returnTo=${returnUrl}`)
  }

  // 2. We are logged in, now grab the invitation directly from PRISMA to verify it
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { 
      organization: true, 
      user: true // The inviter's user model is kept on the invitation
    } 
  })

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>This invitation may have been deleted or never existed.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (invitation.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation {invitation.status}</CardTitle>
            <CardDescription>This invitation is no longer active.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Storefront size={32} weight="duotone" className="text-primary" />
          </div>
          <CardTitle className="text-2xl">You've been invited!</CardTitle>
          <CardDescription>
            <strong>{invitation.user.name}</strong> has invited you to join <strong>{invitation.organization.name}</strong> as a <em>{invitation.role || "Member"}</em>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteClient token={id} orgName={invitation.organization.name} />
        </CardContent>
      </Card>
    </div>
  )
}
