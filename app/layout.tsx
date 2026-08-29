// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Montserrat, Inter, Geist_Mono, Manrope, Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Extra body-typeface choices for the one-click font switcher (Settings > Typography —
// see FontStyleProvider). Each is exposed as its own CSS variable; FontStyleProvider
// points --font-active at whichever one the user picked (default: the system font
// stack, i.e. none of these — see globals.css).
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "MyOffice — Business Operating Platform by Ozech",
  description:
    "Organise your business information elegantly. Personnel, operations, safety, analytics — all in one platform designed for African businesses.",
  keywords: ["business management", "ERP", "workflow", "Africa", "Ozech"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline script below stamps `data-theme` and the
    // `.dark` class onto <html> before React hydrates, so the client attributes
    // deliberately differ from the server-rendered ones. Scoped to this element's own
    // attributes only — it does not suppress warnings for any child.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme to <html> before first paint. Without this, every
            load renders light and only flips once ThemeProvider's effect runs — a
            white flash on each navigation for anyone using dark mode. Kept in sync
            with THEME_KEY / the .dark class in design-system/tokens.tsx.
            A first-ever visit (no stored preference yet) falls back to the OS's
            prefers-color-scheme instead of hardcoding light — once the user picks
            explicitly (via the in-app toggle), that stored choice always wins over
            the OS setting from then on. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('myoffice_theme');var d=v?v==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';var s={small:0.925,'default':1,large:1.075,xlarge:1.15}[localStorage.getItem('oz_fontScale')];if(s){document.documentElement.style.zoom=String(s);}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${montserrat.variable} ${inter.variable} ${geistMono.variable} ${manrope.variable} ${plusJakarta.variable} ${sora.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
              border: "1px solid #e2ecf5",
              boxShadow: "0 4px 16px rgba(42,77,105,0.10)",
            },
          }}
        />
      </body>
    </html>
  );
}
