import { Hero } from "@/components/hero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
   BellRingingIcon,
   TrendUpIcon,
   DevicesIcon,
   MapPinLineIcon,
   ClockIcon,
   CheckCircleIcon
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function Page() {
   return (
      <>
         <Hero />

         {/* Features Section */}
            <section className="container mx-auto px-6 py-20">
               <div className="text-center max-w-2xl mx-auto mb-16">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">Why Guestmaxxing?</h2>
                  <p className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                     Elevate your dining management software.
                  </p>
                  <p className="mt-4 text-muted-foreground text-lg">
                     We've combined powerful engineering with sleek design to create the ultimate reservation experience.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <FeatureCard
                     icon={<TrendUpIcon size={32} weight="duotone" className="text-primary" />}
                     title="Real-time Analytics"
                     description="Monitor your restaurant's performance with live updates and predictive insights."
                  />
                  <FeatureCard
                     icon={<BellRingingIcon size={32} weight="duotone" className="text-primary" />}
                     title="Smart Notifications"
                     description="Instant alerts for waitlists, cancellations, and guest arrivals across all devices."
                  />
                  <FeatureCard
                     icon={<DevicesIcon size={32} weight="duotone" className="text-primary" />}
                     title="Multi-device Sync"
                     description="Access your dashboard from anywhere—phone, tablet, or desktop. Always in sync."
                  />
               </div>
            </section>

            {/* Integration Section */}
            <section className="bg-muted py-24">
               <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div>
                     <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                        Built for <span className="text-primary">Performance</span>.
                     </h2>
                     <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                        Under the hood, Guestmaxxing uses cutting-edge technologies like Prisma, Next.js, and Better Auth to ensure your data is secure and your interface is blazingly fast.
                     </p>
                     <ul className="mt-10 space-y-4">
                        {[
                           "Optimized API response times",
                           "Granular table management control",
                           "Integrated guest profiling",
                           "Cross-time-zone date synchronization"
                        ].map((item, idx) => (
                           <li key={idx} className="flex items-center gap-3 text-foreground font-medium">
                              <CheckCircleIcon size={20} weight="fill" className="text-primary shrink-0" />
                              {item}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-background p-8 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center">
                        <MapPinLineIcon size={48} weight="bold" className="text-primary mb-4" />
                        <span className="font-bold text-foreground">Local Discovery</span>
                     </div>
                     <div className="bg-background p-8 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center mt-6">
                        <ClockIcon size={48} weight="bold" className="text-primary mb-4" />
                        <span className="font-bold text-foreground">Instant Booking</span>
                     </div>
                  </div>
               </div>
            </section>

         {/* Footer */}
         <footer className="border-t py-12 bg-background">
            <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-foreground">Guestmaxxing.</span>
                  <span className="text-sm text-muted-foreground">© 2026 All rights reserved.</span>
               </div>
               <div className="flex gap-8 text-sm font-medium text-muted-foreground">
                  <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                  <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
               </div>
            </div>
         </footer>
      </>
   );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
   return (
      <Card className="rounded-3xl border-muted/50 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
         <CardHeader className="pb-2">
            <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/5">
               {icon}
            </div>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
         </CardHeader>
         <CardContent>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
               {description}
            </CardDescription>
         </CardContent>
      </Card>
   );
}
