// components/Footer.tsx
'use client';

import Link from "next/link";

const LINKS = [
  { label: "Personnel",        href: "/employees" },
  { label: "Maintenance",      href: "/maintenance" },
  { label: "Leaves",           href: "/leaves" },
  { label: "Inventory",        href: "/inventory" },
  { label: "SHEQ",             href: "/sheq" },
  { label: "Room Rental",      href: "/roomRental" },
  { label: "Restaurant",       href: "/restaurant" },
  { label: "RoadReady",        href: "/drivingSchool" },
  { label: "Reports",          href: "/reports" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 backdrop-blur-[2px]">
      <div className="container mx-auto px-4 py-4">

        {/* Single compact row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Brand mark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-6 w-6 rounded-full bg-[#86BBD8]/80 flex items-center justify-center text-[#1e3a52] font-bold text-xs font-heading">
              O
            </div>
            <span className="text-xs font-semibold text-white/70 font-heading tracking-wide">MyOffice</span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-[10px] text-white/35">by Ozech</span>
          </div>

          {/* Quick nav links */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] text-white/45 hover:text-white/85 transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-[10px] text-white/30 shrink-0 text-right">
            © {new Date().getFullYear()} Ozech Investments
          </p>

        </div>
      </div>
    </footer>
  );
}
