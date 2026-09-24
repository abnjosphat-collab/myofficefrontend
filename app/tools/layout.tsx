import type { Metadata, Viewport } from "next";

const appName = "Dallaglio Portable Tools and Equipment E-System";
const description =
  "Find, issue, return and account for portable tools and equipment across Dallaglio departments with searchable registers, clear custody records and a permanent history.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://myofficefrontend.vercel.app",
  ),
  title: appName,
  description,
  applicationName: appName,
  keywords: [
    "portable tools",
    "equipment management",
    "tool register",
    "equipment custody",
    "Dallaglio",
  ],
  manifest: "/tools/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/tools-icon.svg", type: "image/svg+xml" },
      { url: "/icons/tools-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/tools-apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: appName,
    description,
    siteName: appName,
    type: "website",
    url: "/tools",
    images: [
      {
        url: "/icons/tools-share-1200x630.png",
        width: 1200,
        height: 630,
        alt: `${appName} app preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description,
    images: ["/icons/tools-share-1200x630.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dallaglio Tools",
  },
};

export const viewport: Viewport = {
  themeColor: "#17151f",
  width: "device-width",
  initialScale: 1,
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
