// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, Geist_Mono, Manrope, Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import { MyOfficeAccessBoundary } from "@/components/MyOfficeAccessBoundary";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://myofficefrontend.vercel.app",
  ),
  title: "Dallaglio Portable Tools and Equipment E-System",
  description:
    "Find, issue, return and account for portable tools and equipment across Dallaglio departments with searchable registers, clear custody records and a permanent history.",
  applicationName: "Dallaglio Portable Tools and Equipment E-System",
  keywords: ["portable tools", "equipment management", "tool register", "equipment custody", "Dallaglio"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dallaglio Tools",
  },
  openGraph: {
    title: "Dallaglio Portable Tools and Equipment E-System",
    description:
      "Find, issue, return and account for portable tools and equipment with searchable registers, clear custody records and a permanent history.",
    siteName: "Dallaglio Portable Tools and Equipment E-System",
    type: "website",
    url: "/tools",
    images: [{
      url: "/icons/tools-share-1200x630.png",
      width: 1200,
      height: 630,
      alt: "Dallaglio Portable Tools and Equipment E-System app preview",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dallaglio Portable Tools and Equipment E-System",
    description:
      "Find, issue, return and account for portable tools and equipment with searchable registers, clear custody records and a permanent history.",
    images: ["/icons/tools-share-1200x630.png"],
  },
};

// themeColor/viewport live in a separate export (not `metadata`) as of Next.js 14+ —
// putting themeColor in `metadata` is deprecated and silently ignored.
export const viewport: Viewport = {
  themeColor: "#17151f",
  width: "device-width",
  initialScale: 1,
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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Applies the saved theme to <html> before first paint. Without this, every
            load renders light and only flips once ThemeProvider's effect runs — a
            white flash on each navigation for anyone using dark mode. Kept in sync
            with THEME_KEY / the .dark class in design-system/tokens.tsx.
            Stored `system` (or no value) follows prefers-color-scheme; explicit
            light/dark always wins. Kept in sync with readThemePreference() in
            design-system/tokens.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem('myoffice_theme');var d=v==='dark'||(v!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';var s={small:0.925,'default':1,large:1.075,xlarge:1.15}[localStorage.getItem('oz_fontScale')];if(s){document.documentElement.style.zoom=String(s);}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${montserrat.variable} ${inter.variable} ${geistMono.variable} ${manrope.variable} ${plusJakarta.variable} ${sora.variable} antialiased`}
      >
        <Providers>
          <MyOfficeAccessBoundary>{children}</MyOfficeAccessBoundary>
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
