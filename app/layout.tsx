// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Montserrat, Inter, Geist_Mono } from "next/font/google";
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
    <html lang="en">
      <body
        className={`${montserrat.variable} ${inter.variable} ${geistMono.variable} antialiased`}
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
