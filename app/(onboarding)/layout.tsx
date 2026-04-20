import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Check if they ALREADY have an organization. If they do, they shouldn't be here.
  const memberCount = await prisma.member.count({
    where: { userId: session.user.id }
  });

  if (memberCount > 0) {
    redirect("/dashboard"); // Send them back to the app if they somehow landed here
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6 md:p-10">
      {children}
    </div>
  )
}
