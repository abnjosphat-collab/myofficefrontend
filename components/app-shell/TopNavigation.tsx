// components/app-shell/TopNavigation.tsx — shared header for every page, extracted
// from app/page.tsx. Adds a search-results dropdown (any page can jump straight to a
// module) and swaps the old static "JD" avatar placeholder for the real auth-aware
// AuthMenu ported from components/Header.tsx.
'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Loader2, Menu, Search, Settings, SlidersHorizontal, Sun, Moon, X, Clock, ArrowUpRight, Building, IconStyleGlyph, Palette } from '@/components/shared/theme';
import { useTheme, useIconStyle, rgbaFromHexSafe, ACCENT_HEX } from '@/components/shared/theme';
import { CATEGORIES } from './modules';
import { AuthMenu } from './AuthMenu';
import { useNotifications } from './useNotifications';
import { trackSearch, getSearchHistory, clearSearchHistory } from '@/lib/usage';

export function TopNavigation({
  onMenuToggle, searchQuery, onSearchChange, mobileSearchOpen, setMobileSearchOpen, onCustomize, onPreferences, accentHex,
}: {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mobileSearchOpen: boolean;
  setMobileSearchOpen: (v: boolean) => void;
  onCustomize: () => void;
  onPreferences: () => void;
  accentHex: string;
}) {
  const t = useTheme();
  const router = useRouter();
  const { iconStyle, toggleIconStyle } = useIconStyle();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const { notifications, unreadCount, loading: activityLoading, markAllRead } = useNotifications();
  const glow = rgbaFromHexSafe(accentHex, t.light ? 0.16 : 0.28);

  // A single, clean search field — one subtle border, one soft focus ring. (The old
  // `t.inputBg` carries its own border and `type="search"` adds native inner
  // decorations, which together read as a doubled/messy edge.)
  const searchCls = `w-full h-9 pl-9 pr-3 rounded-xl text-[13px] border transition-all duration-200 focus:outline-none ${
    t.light
      ? 'bg-gray-100/70 border-gray-200/80 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/15'
      : 'bg-white/[0.06] border-white/10 text-white placeholder-white/40 focus:bg-white/[0.09] focus:border-brand-300/40 focus:ring-2 focus:ring-brand-300/15'
  }`;

  const searchMatches = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return CATEGORIES.flatMap(cat => cat.modules
      .filter(m => m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query))
      .map(m => ({ module: m, accent: cat.accent }))
    ).slice(0, 8);
  }, [searchQuery]);

  const refreshHistory = useCallback(() => setHistory(getSearchHistory(6)), []);

  // Commit a search: log it (so it shows in history + the Usage Analyzer) and, if a
  // destination is given, navigate there. Called on result-click and on Enter.
  const commitSearch = useCallback((href?: string) => {
    if (searchQuery.trim()) trackSearch(searchQuery, searchMatches.length);
    if (href) { router.push(href); onSearchChange(''); setMobileSearchOpen(false); }
  }, [searchQuery, searchMatches.length, router, onSearchChange, setMobileSearchOpen]);

  const onSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchMatches.length > 0) { e.preventDefault(); commitSearch(searchMatches[0].module.href); }
    else if (e.key === 'Escape') { onSearchChange(''); (e.target as HTMLInputElement).blur(); }
  }, [searchMatches, commitSearch, onSearchChange]);

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

        <Link href="/" className={`group flex items-center gap-2 shrink-0 h-11 px-2 rounded-lg ${t.hoverBgSoft} transition-colors`} title="Home">
          {/* An office building, not a house — it's literally the "Office" in MyOffice,
             reads as a considered brand mark rather than a generic dashboard glyph.
             Violet/indigo gradient badge, not blue. Inset highlight + soft glow gives it
             dimension without a gimmick hover animation. */}
          <span
            className="relative h-[30px] w-[30px] shrink-0 rounded-[10px] flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{
              background: 'linear-gradient(155deg, #a78bfa 0%, #7c3aed 55%, #5b21b6 100%)',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -6px 10px -6px rgba(0,0,0,0.35), 0 6px 16px -6px ${ACCENT_HEX.violet}80`,
            }}
          >
            <Building weight="fill" className="h-4 w-4 text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.2))]" />
          </span>
          <span className={`hidden sm:inline ${t.textPrimary} text-[14px] font-semibold tracking-tight`}>MyOffice</span>
        </Link>

        <div className="flex-1" />

        {!mobileSearchOpen && (
          <div className="hidden md:flex w-full max-w-sm mx-2 relative">
            <div className="relative w-full">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint} pointer-events-none`} />
              <input
                type="text"
                placeholder="Search modules, employees, documents…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onFocus={() => { setSearchFocused(true); refreshHistory(); }}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                className={searchCls}
              />
            </div>
            {searchFocused && searchQuery && searchMatches.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1.5 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-50`}>
                <div className={`px-3 py-1.5 border-b ${t.border} text-[10.5px] font-semibold uppercase tracking-wide ${t.textFaint}`}>
                  Jump to module
                </div>
                {searchMatches.map(({ module }) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    // Navigate on mousedown, not click: pressing a result blurs the
                    // input, whose 150ms grace timer unmounts this dropdown — a press
                    // held longer than that removed the row before its click ever
                    // fired, so results silently did nothing on slower clicks.
                    // preventDefault keeps the input from blurring; commitSearch
                    // routes + clears. href stays for middle-click/new-tab.
                    onMouseDown={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); commitSearch(module.href); } }}
                    onClick={(e) => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) e.preventDefault(); }}
                    className={`group/row flex items-center gap-2.5 px-3 py-2 ${t.hoverBgSoft} transition-colors`}
                  >
                    <module.icon className={`h-3.5 w-3.5 shrink-0 ${t.textMuted}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] font-medium ${t.textPrimary} truncate`}>{module.title}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{module.description}</p>
                    </div>
                    <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${t.textFaint} opacity-0 group-hover/row:opacity-100 transition-opacity`} />
                  </Link>
                ))}
              </div>
            )}
            {searchFocused && searchQuery && searchMatches.length === 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1.5 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-50 px-3 py-4 text-center text-[12px] ${t.textFaint}`}>
                No modules match “{searchQuery}”
              </div>
            )}
            {searchFocused && !searchQuery && history.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1.5 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-50`}>
                <div className={`flex items-center justify-between px-3 py-2 border-b ${t.border}`}>
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${t.textFaint}`}>Recent searches</span>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); clearSearchHistory(); refreshHistory(); }}
                    className={`text-[11px] ${t.textFaint} hover:text-rose-400 transition-colors`}
                  >Clear</button>
                </div>
                {history.map(q => (
                  <button
                    key={q}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onSearchChange(q); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${t.hoverBgSoft} transition-colors text-left`}
                  >
                    <Clock className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />
                    <span className={`text-[12.5px] ${t.textMuted} truncate`}>{q}</span>
                  </button>
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
            onClick={toggleIconStyle}
            className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`}
            type="button"
            title={iconStyle === 'solid' ? 'Icons: Solid — switch to Outline' : 'Icons: Outline — switch to Solid'}
          >
            {/* half-filled circle reads as a fill-style control; itself flips solid/outline with the setting */}
            <IconStyleGlyph className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onPreferences}
            className={`h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`}
            type="button"
            title="Preferences — theme, font & layout"
          >
            <Palette className="h-[18px] w-[18px]" />
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
              onClick={() => { setNotifOpen(v => { const next = !v; if (next) markAllRead(); return next; }); }}
              className={`relative h-11 w-11 flex items-center justify-center ${t.hoverBg} ${t.textMuted}`}
              type="button" title="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center text-[9px] font-bold text-white bg-rose-500 rounded-full ring-2 ${t.light ? 'ring-white' : 'ring-slate-900'}`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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
                      ) : notifications.length === 0 ? (
                        <div className={`px-3 py-6 text-center text-[12px] ${t.textFaint}`}>No recent activity</div>
                      ) : notifications.map(item => (
                        <div key={item.id} className={`flex items-start gap-2 px-3 py-2 ${t.hoverBgSoft} ${item.unread ? (t.light ? 'bg-brand-50/60' : 'bg-brand-500/10') : ''}`}>
                          <item.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.status === 'critical' ? 'text-rose-400' : t.textFaint}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] ${t.textMuted} truncate`}>{item.action}</p>
                            <p className={`text-[10.5px] ${t.textFaint}`}>{item.time ? `${item.time} ago` : ''}{item.user ? ` · ${item.user}` : ''}</p>
                          </div>
                          {item.unread && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />}
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
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint} pointer-events-none`} />
            <input
              type="text"
              autoFocus
              placeholder="Search modules…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className={searchCls}
            />
            {searchQuery && searchMatches.length > 0 && (
              <div className={`mt-2 ${t.glass} rounded-xl ${t.shadow} overflow-hidden`}>
                <div className={`px-3 py-1.5 border-b ${t.border} text-[10.5px] font-semibold uppercase tracking-wide ${t.textFaint}`}>
                  Jump to module
                </div>
                {searchMatches.map(({ module }) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    // commitSearch(href) rather than commitSearch(): also clears the
                    // query and closes the mobile search panel after navigating.
                    onClick={() => commitSearch(module.href)}
                    className={`group/row flex items-center gap-2.5 px-3 py-2 ${t.hoverBgSoft} transition-colors`}
                  >
                    <module.icon className={`h-3.5 w-3.5 shrink-0 ${t.textMuted}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] font-medium ${t.textPrimary} truncate`}>{module.title}</p>
                      <p className={`text-[11px] ${t.textFaint} truncate`}>{module.description}</p>
                    </div>
                    <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${t.textFaint} opacity-0 group-hover/row:opacity-100 transition-opacity`} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
