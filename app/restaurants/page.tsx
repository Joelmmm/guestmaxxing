import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPinIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Explore Restaurants | Guestmaxing",
  description: "Discover and book the best restaurants in town.",
};

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <SiteHeader />
      <main className="flex-1">
        <section className="container mx-auto px-6 py-12 md:py-20">
          <div className="max-w-2xl mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
              Explore Restaurants
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover amazing dining experiences and book your table instantly.
            </p>
          </div>

          {restaurants.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/30">
              <p className="text-muted-foreground text-lg">No restaurants available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {restaurants.map((restaurant) => (
                <Link key={restaurant.id} href={`/reserve/${restaurant.slug}`} className="group outline-none">
                  <Card className="h-full rounded-3xl border-muted/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-primary">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 group-hover:scale-105 transition-transform duration-500" />
                      {/* You can add an image here if the database schema evolves to include one */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-muted-foreground/30 uppercase tracking-widest">{restaurant.name.charAt(0)}</span>
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                        {restaurant.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-2">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{restaurant.timezone}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClockIcon className="w-4 h-4" />
                        <span>
                          {restaurant.isAcceptingReservations 
                            ? "Accepting Reservations" 
                            : "Reservations Paused"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t py-12 bg-background mt-auto">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground">Guestmaxing.</span>
            <span className="text-sm text-muted-foreground">© 2026 All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
