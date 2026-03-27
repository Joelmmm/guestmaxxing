import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UsersFourIcon } from "@phosphor-icons/react/dist/ssr";

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="container mx-auto px-6 py-16 sm:py-24 lg:flex lg:items-center lg:gap-x-12 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
          <div className="flex">
            <div className="relative flex items-center gap-x-1.5 rounded-full px-3 py-1 text-xs leading-6 text-primary ring-1 ring-primary/20 transition-all hover:ring-primary/40 bg-primary/5">
              <span className="font-semibold uppercase tracking-wider">New</span>
              <span className="h-4 w-px bg-primary/20" />
              <span>Table management for everyone</span>
            </div>
          </div>
          <h1 className="mt-8 max-w-lg text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1]">
            Dine with <span className="text-primary italic">Precision</span> and Style.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-xl">
            Experience the future of restaurant reservations. Seamless booking, real-time availability, and curated dining experiences at your fingertips.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Button size="lg" className="rounded-full px-8 text-base font-semibold shadow-xl shadow-primary/20 hover:scale-105 transition-transform" asChild>
              <Link href="/restaurants">Explore Restaurants</Link>
            </Button>
            <Link href="/about" className="text-sm font-semibold leading-6 text-foreground flex items-center gap-1 group">
              Learn more <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 border-t pt-8 text-muted-foreground max-w-lg">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">150+</span>
              <span className="text-xs uppercase tracking-widest font-medium">Venues</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">24k+</span>
              <span className="text-xs uppercase tracking-widest font-medium">Happy Table</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">4.9/5</span>
              <span className="text-xs uppercase tracking-widest font-medium">Rating</span>
            </div>
          </div>
        </div>

        <div className="mt-16 sm:mt-24 lg:mt-0 lg:shrink-0 lg:grow">
          <div className="relative mx-auto max-w-[540px] perspective-1000">
            <div className="relative overflow-hidden rounded-3xl border bg-card shadow-2xl p-2 transition-transform duration-700 hover:rotate-y-6 hover:rotate-x-2">
              <Image
                src="/hero-restaurant.png"
                alt="Restaurant Interior"
                width={800}
                height={1000}
                className="rounded-2xl object-cover aspect-4/5"
                priority
              />
              <div className="absolute top-8 right-8 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-1000">
                <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded-full text-primary">
                  <UsersFourIcon size={24} weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reservations</p>
                  <p className="text-sm font-bold text-foreground">Updated live</p>
                </div>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -left-6 h-32 w-32 bg-primary/20 blur-3xl rounded-full" />
            <div className="absolute -top-6 -right-6 h-32 w-32 bg-accent/20 blur-3xl rounded-full" />
          </div>
        </div>
      </div>

      {/* Background gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-36.125rem -translate-x-1/2 rotate-30deg bg-linear-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-72.1875rem" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
      </div>
    </div>
  );
}
