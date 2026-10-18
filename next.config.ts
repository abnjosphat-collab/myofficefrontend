import type { NextConfig } from "next";

// Backend + Supabase hosts the browser must talk to (NEXT_PUBLIC_API_URL and
// NEXT_PUBLIC_SUPABASE_URL). Vercel previews of this repo point at the same
// production backend; a preview pointed elsewhere would surface as CSP reports.
const API_HOST = "https://myofficebackend.onrender.com";
const SUPABASE_HOST = "https://geomlsxphwaxpaloweky.supabase.co";

// Hashes of the two layout pre-paint scripts (app/layout.tsx), taken from served
// bytes 2026-10-18. If either script changes, recompute with the mo-csphash
// recipe (fetch / and sha256 the exact script bodies) and update these.
const PRE_PAINT_HASH = "'sha256-DutM3M1/aDhmHwTil+YywPswE6gi+d5qjHeXk3A8W8o='";
const APPEARANCE_HASH = "'sha256-gWu0xpSlRI/BXaUbauJd8qzGwsLS1rtoWpNn21bzxI0='";

// Report-Only on purpose (2026-10-18): the App Router's inline flight-data
// scripts change every build and cannot be hashed, so an enforcing policy would
// break navigation. MOVING TO ENFORCING: add middleware that mints a per-request
// nonce, passes it to <html> via the x-nonce header pattern from the Next.js
// CSP docs, appends 'nonce-<value>' to script-src, then flip this header to
// Content-Security-Policy and watch a full route-suite pass before shipping.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' ${PRE_PAINT_HASH} ${APPEARANCE_HASH}`,
  "style-src 'self' 'unsafe-inline'", // Tailwind + Radix inject <style>; React style={} needs attr allowance
  `img-src 'self' data: blob: ${API_HOST} ${SUPABASE_HOST}`, // photo/signature capture + stored images
  `connect-src 'self' ${API_HOST} ${SUPABASE_HOST}`,
  "font-src 'self' data:", // next/font is self-hosted
  "media-src 'self' blob: data:", // Tools audio feedback playback
  "frame-src 'self' blob:", // PDF preview embeds
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors fail the build — keep this strict to catch real issues
    ignoreBuildErrors: false,
  },
  // No images.remotePatterns: next/image is unused (verified 2026-10-18, zero
  // 'next/image' imports), so there is no remote image surface to declare.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // camera: photo + signature capture. Everything else denied.
            value: "camera=(self), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
