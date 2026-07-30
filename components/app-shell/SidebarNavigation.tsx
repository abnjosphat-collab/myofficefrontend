// components/app-shell/SidebarNavigation.tsx — shared left pane, extracted from
// app/page.tsx as-is.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, ChevronDown, Lightbulb, PanelLeftClose, PanelLeftOpen, Pencil, X,
} from '@/components/shared/theme';
import {
  useTheme, Collapse, staggerContainer, fadeUp, ACCENT_RGBA, rgbaFromHexSafe, type Accent,
} from '@/components/shared/theme';
import { trackModuleUsage, type Category, type Module } from './modules';
import { useDashboardData } from './useDashboardData';

function SidebarCategoryRow({ cat, isOpen, onToggle, accentHex }: { cat: Category; isOpen: boolean; onToggle: () => void; accentHex: string }) {
  const t = useTheme();
  const catOpen = isOpen;
  return (
    <div>
      <button
        onClick={onToggle}
        type="button"
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-all duration-300 hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-px group`}
      >
        <cat.icon className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: accentHex }} />
        <span className="flex-1 truncate text-left">{cat.title}</span>
        <span className={`text-[10px] ${t.textTertiary} tabular-nums`}>{cat.modules.length}</span>
        <motion.span animate={{ rotate: catOpen ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
          <ChevronDown className={`h-3 w-3 ${t.textFaint}`} />
        </motion.span>
      </button>
      <Collapse open={catOpen}>
        <div className="space-y-0.5 py-0.5 pl-8">
          {cat.modules.map(module => (
            <Link
              key={module.href}
              href={module.href}
              onClick={() => trackModuleUsage(module.href)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12.5px] ${t.textTertiary} ${t.hoverBg} ${t.hoverText} transition-colors`}
            >
              <module.icon className="h-3.5 w-3.5 shrink-0" style={{ color: accentHex }} />
              <span className="truncate">{module.title}</span>
            </Link>
          ))}
        </div>
      </Collapse>
    </div>
  );
}

export function SidebarNavigation({
  isOpen, onClose, collapsed, onToggleCollapsed, favoriteModules, accentHex, onToggleFavorite, visibleCategories,
}: {
  isOpen: boolean; onClose: () => void; collapsed: boolean; onToggleCollapsed: () => void;
  favoriteModules: { module: Module; accent: Accent }[]; accentHex: string; onToggleFavorite: (href: string) => void;
  visibleCategories: Category[];
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ favorites: true, modules: false, activity: false, status: false, tips: false });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [hovered, setHovered] = useState(false);
  const [scrollEdge, setScrollEdge] = useState<'top' | 'bottom' | null>(null);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const t = useTheme();
  const { activity, stats } = useDashboardData();

  const visuallyCollapsed = collapsed && !hovered;

  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCat = (id: string) => setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));

  const flashEdge = (edge: 'top' | 'bottom') => {
    setScrollEdge(edge);
    window.setTimeout(() => setScrollEdge(prev => (prev === edge ? null : prev)), 550);
  };
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop <= 0) flashEdge('top');
    else if (el.scrollHeight - el.scrollTop - el.clientHeight <= 1) flashEdge('bottom');
  };

  return (
    <>
      {isOpen && <div className={`fixed inset-0 ${t.scrim} backdrop-blur-[1px] z-30 lg:hidden`} onClick={onClose} />}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onScroll={handleScroll}
        className={`fixed top-11 left-0 h-[calc(100vh-44px)] ${visuallyCollapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64 ${t.glass} border-y-0 border-l-0 z-40 transition-[transform,width,box-shadow] duration-300 overflow-y-auto overflow-x-hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          boxShadow: t.light
            ? `10px 0 32px -18px rgba(15,23,42,0.28), 1px 0 0 rgba(15,23,42,0.04), 0 0 40px -20px ${rgbaFromHexSafe(accentHex, 0.35)} inset`
            : `10px 0 40px -16px rgba(0,0,0,0.55), 1px 0 0 rgba(255,255,255,0.04), 0 0 40px -20px ${rgbaFromHexSafe(accentHex, 0.4)} inset`,
        }}
      >
        <AnimatePresence>
          {scrollEdge === 'top' && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none sticky top-0 left-0 right-0 h-6 -mb-6 z-10"
              style={{ background: `linear-gradient(to bottom, ${ACCENT_RGBA.blue}, transparent)` }}
            />
          )}
        </AnimatePresence>

        <div className={`hidden lg:block px-3 py-2.5 border-b ${t.border} shrink-0`}>
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center gap-2 h-8 ${visuallyCollapsed ? 'w-8 justify-center px-0' : 'w-full px-2.5'} rounded-lg ${t.glassSoft} ${t.hoverBg} ${t.textMuted} ${t.hoverText} ${t.shadow} transition-all`}
            type="button"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
            {!visuallyCollapsed && <span className="text-[12px] font-medium">Collapse</span>}
          </button>
        </div>

        <motion.nav variants={staggerContainer} initial="hidden" animate="show" className="p-4 space-y-0.5 flex-1">
          <motion.div variants={fadeUp} className={`mt-6 pt-5 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <div className="flex items-center gap-1 px-3 mb-1">
              <button
                onClick={() => toggleSection('favorites')}
                className={`flex-1 flex items-center justify-between text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
                type="button"
              >
                <span>Favorites</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.favorites ? 'rotate-180' : ''}`} />
              </button>
              {favoriteModules.length > 0 && (
                <button
                  onClick={() => setEditingFavorites(v => !v)}
                  type="button"
                  title={editingFavorites ? 'Done editing' : 'Edit favorites'}
                  className={`p-1 rounded-md transition-colors ${editingFavorites ? `${t.chipBg} ${t.textPrimary}` : `${t.textTertiary} ${t.hoverText} ${t.hoverBg}`}`}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
            <Collapse open={!!expandedSections.favorites}>
              <div className="space-y-0.5 pt-1">
                {favoriteModules.length === 0 ? (
                  <p className={`px-3 py-2 text-[12px] ${t.textFaint}`}>Hover a module and tap the bookmark icon to pin it here.</p>
                ) : (
                  favoriteModules.map(({ module }) => (
                    <div key={module.href} className="relative flex items-center">
                      <Link href={module.href} onClick={() => trackModuleUsage(module.href)} className={`flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-all duration-300 hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-px ${editingFavorites ? 'pr-8' : ''}`}>
                        <Bookmark className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: accentHex }} weight="fill" />
                        <span className="truncate">{module.title}</span>
                      </Link>
                      {editingFavorites && (
                        <button
                          onClick={() => onToggleFavorite(module.href)}
                          type="button"
                          title="Remove from favorites"
                          className={`absolute right-2 p-0.5 rounded ${t.hoverBg} text-rose-500 hover:text-rose-400 transition-colors`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Collapse>
          </motion.div>

          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('modules')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span>All Modules</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.modules ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.modules}>
              <div className="space-y-0.5 pt-1">
                {visibleCategories.map(cat => (
                  <SidebarCategoryRow key={cat.id} cat={cat} isOpen={!!expandedCats[cat.id]} onToggle={() => toggleCat(cat.id)} accentHex={accentHex} />
                ))}
              </div>
            </Collapse>
          </motion.div>

          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('activity')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span>Recent Activity</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.activity ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.activity}>
              <div className="space-y-0.5 pt-1">
                {activity.length === 0 ? (
                  <div className={`px-3 py-2 text-[12px] ${t.textFaint}`}>No recent activity</div>
                ) : activity.slice(0, 5).map(item => (
                  <div key={item.id} className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-[12px] ${t.textMuted}`}>
                    <item.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.status === 'critical' ? 'text-rose-400' : t.textTertiary}`} />
                    <div className="min-w-0">
                      <p className="truncate">{item.action}</p>
                      <p className={`text-[10.5px] ${t.textFaint}`}>{item.time ? `${item.time} ago` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Collapse>
          </motion.div>

          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('status')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operations Snapshot
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.status ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.status}>
              <div className="space-y-1.5 pt-1 px-3">
                {[
                  { label: 'Employees', value: stats.employeeCount },
                  { label: 'Active Work Orders', value: stats.activeWorkOrders },
                  { label: 'Equipment Available', value: stats.equipmentAvailablePct !== null ? `${stats.equipmentAvailablePct}%` : null },
                  { label: 'Open Breakdowns', value: stats.openBreakdowns },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className={t.textMuted}>{item.label}</span>
                    <span className={`${t.textTertiary} tabular-nums`}>{item.value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Collapse>
          </motion.div>

          <motion.div variants={fadeUp} className={`mt-4 pt-4 border-t ${t.border} ${visuallyCollapsed ? 'lg:hidden' : ''}`}>
            <button
              onClick={() => toggleSection('tips')}
              className={`w-full flex items-center justify-between px-3 mb-1 text-[11px] font-semibold ${t.textTertiary} uppercase tracking-wider ${t.hoverText} transition-colors`}
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" />
                Tips & Shortcuts
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections.tips ? 'rotate-180' : ''}`} />
            </button>
            <Collapse open={!!expandedSections.tips}>
              <div className="space-y-2.5 pt-1 px-3 pb-1">
                <div>
                  <p className={`text-[12px] font-medium ${t.textPrimary}`}>Global search</p>
                  <p className={`text-[11px] ${t.textFaint} mt-0.5`}>Type in the search bar to jump to any module instantly</p>
                </div>
                <div>
                  <p className={`text-[12px] font-medium ${t.textPrimary}`}>Favourites</p>
                  <p className={`text-[11px] ${t.textFaint} mt-0.5`}>Tap a module's bookmark icon to pin it here</p>
                </div>
                <div>
                  <p className={`text-[12px] font-medium ${t.textPrimary}`}>Customize dashboard</p>
                  <p className={`text-[11px] ${t.textFaint} mt-0.5`}>Use the Customize button up top to add or remove cards</p>
                </div>
              </div>
            </Collapse>
          </motion.div>

          {visuallyCollapsed && (
            <div className={`hidden lg:flex flex-col items-center gap-1 pt-4 mt-4 border-t ${t.border}`}>
              {favoriteModules.slice(0, 5).map(({ module }) => (
                <Link
                  key={module.href}
                  href={module.href}
                  title={module.title}
                  className={`p-2 rounded-lg ${t.hoverBg} ${t.hoverText} transition-colors`}
                >
                  <Bookmark className="h-4 w-4" style={{ color: accentHex }} strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          )}
        </motion.nav>

        <AnimatePresence>
          {scrollEdge === 'bottom' && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none sticky bottom-0 left-0 right-0 h-6 -mt-6 shrink-0"
              style={{ background: `linear-gradient(to top, ${ACCENT_RGBA.blue}, transparent)` }}
            />
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
}
