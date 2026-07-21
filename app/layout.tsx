import { Geist_Mono, Outfit, Montserrat, Lora, Inconsolata } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner"

const inconsolataInconsolata = Inconsolata({subsets:['latin','latin-ext','vietnamese'],weight:['200','300','400','500','600','700','800','900'],variable:'--font-inconsolata'});

const loraLora = Lora({subsets:['cyrillic','cyrillic-ext','latin','latin-ext','math','symbols','vietnamese'],weight:['400','500','600','700'],variable:'--font-lora'});

const montserratMontserrat = Montserrat({subsets:['cyrillic','cyrillic-ext','latin','latin-ext','vietnamese'],weight:['100','200','300','400','500','600','700','800','900'],variable:'--font-montserrat'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, outfit.variable, montserratMontserrat.variable, loraLora.variable, inconsolataInconsolata.variable)}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
