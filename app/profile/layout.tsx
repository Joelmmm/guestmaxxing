import { SiteHeader } from "@/components/site-header"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
