import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPinIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Explore Restaurants | Guestmaxxing",
  description: "Discover and book the best restaurants in town.",
};

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      images: true
      }
    });

  return (
    <>
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
                    {(() => {
                      const coverImage = restaurant.images.find(img => img.isCover) || restaurant.images[0];
                      return (
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {coverImage ? (
                            <Image
                              src={`/api/restaurants/${restaurant.id}/images/${coverImage.id}`}
                              alt={coverImage.altText || restaurant.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-bold text-muted-foreground/30 uppercase tracking-widest">{restaurant.name.charAt(0)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
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
    </>
  );
}
