// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import { MyOfficeAccessBoundary } from "@/components/MyOfficeAccessBoundary";
// Server component: import the pure appearance module, not the client barrel.
import { APPEARANCE_BOOTSTRAP } from "@/components/ui-system/appearance/appearance";

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

// The three interface typefaces of the UI system (Inter body, Plus Jakarta Sans display,
// Manrope as the alternative). Each is exposed as a CSS variable on <html>; the
// appearance preference picks which one --mo-font-body resolves to (see ui-system tokens.css).
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://myofficefrontend.vercel.app",
  ),
  title: "MyOffice",
  description:
    "MyOffice mine engineering ERP and MIS: work orders, maintenance, timesheets, equipment, spares, safety and registers in one workspace.",
  applicationName: "MyOffice",
  keywords: ["myoffice", "mine engineering", "erp", "mis", "work orders", "maintenance"],
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
    title: "MyOffice",
  },
  openGraph: {
    title: "MyOffice",
    description:
    "MyOffice mine engineering ERP and MIS: work orders, maintenance, timesheets, equipment, spares, safety and registers in one workspace.",
    siteName: "MyOffice",
    type: "website",
    url: "/",
    images: [{
      url: "/icons/icon-192.png",
      width: 192,
      height: 192,
      alt: "MyOffice app icon",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyOffice",
    description:
    "MyOffice mine engineering ERP and MIS: work orders, maintenance, timesheets, equipment, spares, safety and registers in one workspace.",
    images: ["/icons/icon-192.png"],
  },
};

// themeColor/viewport live in a separate export (not `metadata`) as of Next.js 14+ —
// putting themeColor in `metadata` is deprecated and silently ignored.
export const viewport: Viewport = {
  themeColor: "#f4f6f5",
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / rounded corners; the shell pads with env(safe-area-inset-*) (tokens.css --mo-safe-*).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline scripts below stamp `data-theme`,
    // `data-font` and `--mo-text-scale` onto <html> before React hydrates, so the client
    // attributes deliberately differ from the server-rendered ones. Scoped to this element's own
    // attributes only — it does not suppress warnings for any child.
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable} ${geistMono.variable} ${manrope.variable} ${plusJakarta.variable}`}>
      <head>
        {/* Pre-paint: one light appearance (no theme switch), the saved typeface and the saved
            text size, applied to <html> before first paint so there is no flash or layout jump. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=document.documentElement;h.classList.remove('dark');h.dataset.theme='light';h.style.colorScheme='light';}catch(e){}})();`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <Providers>
          <MyOfficeAccessBoundary>{children}</MyOfficeAccessBoundary>
        </Providers>
        {/* Bottom centre: top-right sat on every page header's primary action for the few seconds after a save. */}
        <Toaster
          position="bottom-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--mo-font-body)",
              border: "1px solid var(--mo-line)",
              boxShadow: "var(--mo-shadow-popover)",
            },
          }}
        />
      </body>
    </html>
  );
}
