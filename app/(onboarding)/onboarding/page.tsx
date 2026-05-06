import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Storefront, EnvelopeSimpleOpen } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) return null;

  // Check for pending invites by email
  const pendingInvites = await prisma.invitation.findMany({
    where: { email: session.user.email, status: "pending" },
    include: {
      organization: true
    }
  });

  return (
    <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 p-8">
      <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <EnvelopeSimpleOpen size={32} weight="duotone" className="text-primary" />
          </div>
          <CardTitle className="text-2xl">Pending Invites</CardTitle>
          <CardDescription>
            Join an existing team.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 pb-8">
          {pendingInvites.length > 0 ? (
            <div className="space-y-4 w-full flex-1 flex flex-col justify-center">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="text-left">
                    <p className="font-medium">{invite.organization.name}</p>
                    <p className="text-sm text-muted-foreground">Invited by user {invite.inviterId}</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/accept-invite?id=${invite.id}`}>
                      Accept
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
              <p>No pending invitations found for</p>
              <p className="font-medium text-foreground">{session.user.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Storefront size={32} weight="duotone" className="text-primary" />
          </div>
          <CardTitle className="text-2xl">Create a Workspace</CardTitle>
          <CardDescription>
            Start your own restaurant organization. You will be set as the owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 pb-8">
          <Button asChild size="lg" className="w-full mt-6">
            <Link href="/organization/create">
              Create Organization
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
