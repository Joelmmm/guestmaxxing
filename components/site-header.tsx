"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { ForkKnifeIcon } from "@phosphor-icons/react";

export function SiteHeader() {
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-85">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <ForkKnifeIcon size={24} weight="bold" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground sm:inline-block">
              Guestmaxxing
            </span>
          </Link>
          <nav className="ml-8 hidden items-center gap-6 md:flex">
            <Link
              href="/restaurants"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Restaurants
            </Link>
            <Link
              href="/manage"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              My Bookings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isPending ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button asChild className="rounded-full px-5 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-100">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
