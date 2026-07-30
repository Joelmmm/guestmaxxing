import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="container mx-auto pb-16 pt-8 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-0 md:grid-cols-5">
          {/* Left Column */}
          <div className="max-w-2xl lg:max-w-none md:col-span-3">
            <h1 className="mb-8 text-4xl sm:text-5xl lg:text-7xl font-bold ">
              Guestmaxxing
            </h1>
            <h2 className="text-3xl font-montserrat sm:text-4xl lg:text-6xl leading-[1.1] font-semibold tracking-tight text-foreground">
              Fill your tables. <br className="hidden md:block" />
              <span className="text-primary">Lose the booking headaches.</span>
            </h2>
          </div>

          {/* Right Column: Hero Image */}
          <div className="relative flex w-full items-center justify-center md:col-span-2">
            <Image
              src="/fila-sin-fondo.png"
              alt="Guests lining up to enter a restaurant"
              width={600}
              height={500}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="relative z-10 h-auto w-full max-w-lg object-contain lg:max-w-none"
            />
          </div>
        </div>
        <p className="mt-8 mx-auto max-w-xl text-center w-full leading-8 text-muted-foreground">
          Turn empty tables into filled seats and eliminate double bookings.
          Guestmaxxing gives you complete control over your floor plan—so you can focus on the hospitality.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="font-semibold px-8 py-6 text-lg"
            asChild
          >
            <Link href="/sign-up">Start Taking Reservations</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
