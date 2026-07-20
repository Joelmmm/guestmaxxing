import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getGuestReservationsByUserId } from "@/lib/services/reservations";
import { formatRestaurantTime } from "@/lib/time-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPinLineIcon, ClockIcon, CalendarIcon, UsersIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ACTIVE_RESERVATION_STATUSES } from "@/lib/validations/reservation";

export const metadata = {
  title: "Manage Reservations | Guestmaxxing",
};

export default async function ManagePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Keep it simple as requested: redirect to sign-in or a public auth flow
    redirect("/sign-in?returnTo=/manage");
  }

  const reservations = await getGuestReservationsByUserId(session.user.id);
  console.log("User session:", session);
  console.log("Reservations fetched:", reservations);
  const upcoming = reservations.filter(r => (ACTIVE_RESERVATION_STATUSES as readonly string[]).includes(r.status));
  const past = reservations.filter(r => !(ACTIVE_RESERVATION_STATUSES as readonly string[]).includes(r.status));

  return (
    <div className="min-h-screen bg-muted/20 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Reservations</h1>
                <p className="text-muted-foreground mt-2">Manage your upcoming dining experiences.</p>
            </div>
            <Link href="/">
                <Button variant="outline">Back to Home</Button>
            </Link>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CalendarIcon size={24} className="text-primary" weight="duotone" /> 
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground bg-background p-6 rounded-2xl border text-center">
                You have no upcoming reservations.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((res) => (
                  <ReservationCard key={res.id} reservation={res} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
              <ClockIcon size={24} weight="duotone" />
              Past History
            </h2>
            {past.length === 0 ? (
              <p className="text-muted-foreground bg-background p-6 rounded-2xl border text-center">
                No past reservations found.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {past.map((res) => (
                  <ReservationCard key={res.id} reservation={res} isPast />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ReservationCard({ reservation, isPast = false }: { reservation: any, isPast?: boolean }) {
  const { restaurant, tables } = reservation;
  
  return (
    <Card className={`rounded-3xl border transition-all ${isPast ? 'opacity-70 bg-muted/50' : 'hover:shadow-lg bg-background'}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold">{restaurant.name}</CardTitle>
          <Badge variant={isPast ? "secondary" : "default"} className={!isPast ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}>
            {reservation.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1 mt-1 text-sm">
          <MapPinLineIcon size={16} /> 
          {tables.map((t: any) => t.table.name).join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon size={18} />
                    <span className="font-medium text-foreground">
                        {formatRestaurantTime(reservation.startTime, restaurant.timezone, "EEEE, MMM d")}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockIcon size={18} />
                    <span className="font-medium text-foreground">
                        {formatRestaurantTime(reservation.startTime, restaurant.timezone, "h:mm a")}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
                <UsersIcon size={18} />
                <span className="font-medium text-foreground">Party of {reservation.partySize}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
