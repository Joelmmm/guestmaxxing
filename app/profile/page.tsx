import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const metadata = {
  title: "Profile | Reserva",
  description: "Manage your personal information and preferences.",
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { user } = session;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Profile</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-muted/50 rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your basic profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                <AvatarImage src={user.image || ""} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl uppercase font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">{user.name}</span>
                <span className="text-sm text-muted-foreground font-medium">{user.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
