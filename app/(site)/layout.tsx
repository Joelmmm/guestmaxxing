import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
