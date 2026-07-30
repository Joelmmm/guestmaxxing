import { Hero } from "@/components/hero"
import { FeaturesGrid } from "@/components/features-grid"

import Link from "next/link"

export default function Page() {
  return (
    <>
      <Hero />

      {/* Features Section */}

      <FeaturesGrid />
      <section
        id="features"
        className="container scroll-mt-8 py-16"
      >
        <div className="mx-auto mb-16 text-center">
          <h2 className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
            Seamless Booking
          </h2>
          <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Don&apos;t let a clunky form cost you a reservation
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            Give your guests a frictionless booking experience that turns casual
            browsers into confirmed diners in seconds.
          </p>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-background py-12">
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Guestmaxxing.
            </span>
            <span className="text-sm text-muted-foreground">
              © 2026 All rights reserved.
            </span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/contact"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}
