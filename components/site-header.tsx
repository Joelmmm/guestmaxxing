"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu"
import { List, ArrowRightIcon } from "@phosphor-icons/react"

export function SiteHeader() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
        },
      },
    })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center justify-center">
            <span className="flex size-9 items-center justify-center bg-primary text-xl font-bold text-primary-foreground shadow-sm">
              G
            </span>
          </Link>
          <NavigationMenu viewport={false} className="ml-6 hidden md:flex">
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/restaurants">Restaurants</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/manage">My Bookings</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Desktop Auth Controls */}
        <div className="hidden items-center gap-4 md:flex">
          {isPending ? (
            <Skeleton className="h-9 w-24" />
          ) : session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button
                asChild
                className="px-5 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-100"
              >
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Navigation Drawer */}
        <div className="flex items-center gap-2 md:hidden">
          {isPending ? (
            <Skeleton className="size-9" />
          ) : (
            <Drawer direction="top">
              <DrawerTrigger>
                <List className="size-5" />
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle className="text-2xl font-semibold font-monserrat">Guestmaxxing</DrawerTitle>
                </DrawerHeader>

                <div className="flex flex-col space-y-2 py-4">
                  <Link
                    href="/restaurants"
                    className="flex px-3 py-2 text-xl hover:bg-accent"
                  >
                    Restaurants <ArrowRightIcon className="ml-4" />
                  </Link>

                  <Link
                    href="/manage"
                    className="flex px-3 py-2 text-xl hover:bg-accent"
                  >
                    My Bookings <ArrowRightIcon className="ml-4" />
                  </Link>

                  {session?.user && (
                    <Link
                      href="/profile"
                      className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      Profile
                    </Link>
                  )}
                </div>
                
                <DrawerFooter>
                  {session?.user ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      Log out
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      
                        <Button
                          variant="outline"
                          className="w-full justify-center"
                        >
                          <Link href="/sign-in">Log in</Link>
                        </Button>
                      
                      
                        <Button asChild className="w-full justify-center">
                          <Link href="/sign-up">Get Started</Link>
                        </Button>
                      
                    </div>
                  )}
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </div>
      </div>
    </header>
  )
}
