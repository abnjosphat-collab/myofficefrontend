// components/app-shell/TopNavigation.tsx — shared header for every page, extracted
// from app/page.tsx. Adds a search-results dropdown (any page can jump straight to a
// module) and swaps the old static "JD" avatar placeholder for the real auth-aware
// AuthMenu ported from components/Header.tsx.
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Loader2, Menu, Search, Settings, SlidersHorizontal, Sun, Moon, X } from 'lucide-react';
import { useTheme, rgbaFromHexSafe } from '@/components/shared/theme';
import { CATEGORIES } from './modules';
import { AuthMenu } from './AuthMenu';
import { useDashboardData } from './useDashboardData';

export function TopNavigation({
  onMenuToggle, searchQuery, onSearchChange, mobileSearchOpen, setMobileSearchOpen, onCustomize, accentHex,
}: {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (v: boolean) => void;
  onCustomize: () => void;
  accentHex: string;
}) {
  const t = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { activity, loading: activityLoading } = useDashboardData();
  const hasUrgent = activity.some(a => a.status === 'critical' || a.status === 'pending');
  const glow = rgbaFromHexSafe(accentHex, t.light ? 0.16 : 0.28);

  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return CATEGORIES.flatMap(cat => cat.modules
      .filter(m => m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query))
      .map(m => ({ module: m, accent: cat.accent }))
    ).slice(0, 8);
  }, [searchQuery]);

  return (
    <header
      className={`relative sticky top-0 z-40 ${t.glass} backdrop-saturate-150 border-x-0 border-t-0`}
      style={{
        boxShadow: t.light
          ? `0 1px 0 rgba(255,255,255,0.7) inset, 0 14px 32px -16px ${glow}, 0 10px 24px -18px rgba(15,23,42,0.22)`
          : `0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 36px -16px ${glow}, 0 10px 24px -16px rgba(0,0,0,0.55)`,
      }}
    >
      <div className="flex items-center h-11 px-2 lg:px-3 gap-1">
        <button onClick={onMenuToggle} className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted} lg:hidden shrink-0`} type="button" title="Toggle menu">
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className={`flex items-center gap-2 shrink-0 h-11 px-2 ${t.hoverBgSoft} transition-colors`} title="Home">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[11px] shrink-0">M</div>
          <span className={`hidden sm:inline ${t.textPrimary} text-[14px] font-medium tracking-tight`}>MyOffice</span>
        </Link>

        <div className="flex-1" />

        {!mobileSearchOpen && (
          <div className="hidden md:flex w-full max-w-sm mx-2 relative">
            <div className="relative w-full">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint}`} />
              <input
                type="search"
                placeholder="Search modules, employees, documents…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                className={`w-full h-8 pl-8 pr-3 rounded text-[13px] ${t.inputBg} focus:outline-none focus:shadow-[0_6px_20px_-6px_rgba(59,130,246,0.25)] transition-all duration-300`}
              />
            </div>
            {searchFocused && searchQuery && searchMatches.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1.5 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-50`}>
                {searchMatches.map(({ module }) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    className={`flex items-center gap-2.5 px-3 py-2 ${t.hoverBgSoft} transition-colors`}
                  >
                    <module.icon className={`h-3.5 w-3.5 shrink-0 ${t.textMuted}`} />
                    <div className="min-w-0">
                      <p className={`text-[12.5px] font-medium ${t.textPrimary} truncate`}>{module.title}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{module.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onCustomize}
            className={`hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} ${t.shadow} hover:shadow-[0_8px_20px_-8px_rgba(124,58,237,0.4)] transition-shadow duration-300`}
            type="button"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden lg:inline">Customize</span>
          </button>
          <button
            onClick={t.toggle}
            className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`}
            type="button"
            title={t.light ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {t.light ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted} md:hidden`}
            type="button"
            title="Search"
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setNotifOpen(v => !v)}
              className={`relative h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`}
              type="button" title="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {hasUrgent && <span className={`absolute top-2.5 right-2.5 h-1.5 w-1.5 bg-rose-500 rounded-full ring-2 ${t.light ? 'ring-white' : 'ring-slate-900'}`} />}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute top-full right-0 mt-2 w-72 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-20`}
                  >
                    <div className={`px-3 py-2 border-b ${t.border} text-[11px] font-semibold uppercase tracking-wide ${t.textFaint}`}>Notifications</div>
                    <div className="max-h-64 overflow-y-auto">
                      {activityLoading ? (
                        <div className={`flex items-center justify-center gap-2 py-6 text-[12px] ${t.textFaint}`}>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                        </div>
                      ) : activity.length === 0 ? (
                        <div className={`px-3 py-6 text-center text-[12px] ${t.textFaint}`}>No recent activity</div>
                      ) : activity.map(item => (
                        <div key={item.id} className={`flex items-start gap-2 px-3 py-2 ${t.hoverBgSoft}`}>
                          <item.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.status === 'critical' ? 'text-rose-400' : t.textFaint}`} />
                          <div className="min-w-0">
                            <p className={`text-[12px] ${t.textMuted} truncate`}>{item.action}</p>
                            <p className={`text-[10.5px] ${t.textFaint}`}>{item.time ? `${item.time} ago` : ''}{item.user ? ` · ${item.user}` : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <button onClick={onCustomize} className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`} type="button" title="Settings">
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <AuthMenu />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-2.5">
          <div className="relative w-full">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint}`} />
            <input
              type="search"
              autoFocus
              placeholder="Search modules…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full h-8 pl-8 pr-3 rounded text-[13px] ${t.inputBg} focus:outline-none focus:shadow-[0_6px_20px_-6px_rgba(59,130,246,0.25)] transition-all duration-300`}
            />
          </div>
        </div>
      )}
    </header>
  );
}
