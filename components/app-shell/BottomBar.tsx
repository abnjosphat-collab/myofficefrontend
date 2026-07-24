// components/app-shell/BottomBar.tsx — shared status/feedback strip, extracted
// from app/page.tsx as-is (kept all four items: status, trend, notifications,
// feedback, settings, per explicit direction).
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, Check, PanelLeftClose, PanelLeftOpen, Loader2, MessageCircle, Moon,
  Palette, RotateCcw, Send, Settings, SlidersHorizontal, Star, Sun, TextAa,
} from '@/components/shared/theme';
import { useTheme, ACCENT, useFontStyle, FONT_OPTIONS } from '@/components/shared/theme';
import { useDashboardData } from './useDashboardData';
import { saveFeedback } from '@/lib/usage';

export function BottomBar({
  sidebarCollapsed, onOpenCustomize, onOpenPreferences, onToggleSidebarCollapsed, onResetCustomizations,
}: {
  sidebarCollapsed: boolean; onOpenCustomize: () => void; onOpenPreferences: () => void;
  onToggleSidebarCollapsed: () => void; onResetCustomizations: () => void;
}) {
  const t = useTheme();
  const pathname = usePathname();
  const { font, setFont } = useFontStyle();
  const [openMenu, setOpenMenu] = useState<'notifications' | 'feedback' | 'settings' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);
  const { activity, loading: activityLoading } = useDashboardData();

  const toggleMenu = (menu: 'notifications' | 'feedback' | 'settings') =>
    setOpenMenu(prev => (prev === menu ? null : menu));

  const sendFeedback = () => {
    // Require at least a rating or a comment; persist to the usage store so it
    // surfaces in the Usage Analyzer's feedback view (tagged with the current page).
    if (!feedbackText.trim() && feedbackRating === 0) return;
    saveFeedback(pathname, feedbackRating, feedbackText);
    setFeedbackSent(true);
    setFeedbackText('');
    setFeedbackRating(0);
    setTimeout(() => { setFeedbackSent(false); setOpenMenu(null); }, 1600);
  };

  // Real: derived from the live activity feed (see useDashboardData), not a fake array.
  const hasUrgent = activity.some(a => a.status === 'critical' || a.status === 'pending');

  return (
    <div
      className={`fixed bottom-0 right-0 left-0 ${sidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-64'} h-9 z-40 ${t.glass} border-x-0 border-b-0 backdrop-saturate-150 transition-[left] duration-300`}
      style={{ boxShadow: t.light ? '0 -8px 24px -16px rgba(15,23,42,0.18)' : '0 -8px 24px -14px rgba(0,0,0,0.5)' }}
    >
      <div className="flex items-center h-9 px-3 lg:px-4 gap-3 text-[12px]">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`${t.textFaint} hidden sm:inline`}>All systems operational</span>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <button
            onClick={() => toggleMenu('notifications')}
            type="button"
            title="Notifications"
            className={`relative h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
          >
            <Bell className="h-3.5 w-3.5" />
            {hasUrgent && <span className={`absolute top-1 right-1 h-1.5 w-1.5 bg-rose-500 rounded-full ring-2 ${t.light ? 'ring-white' : 'ring-slate-900'}`} />}
          </button>
          <AnimatePresence>
            {openMenu === 'notifications' && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute bottom-full right-0 mb-2 w-72 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-20`}
                >
                  <div className={`px-3 py-2 border-b ${t.border} text-[11px] font-semibold uppercase tracking-wide ${t.textTertiary}`}>Notifications</div>
                  <div className="max-h-64 overflow-y-auto">
                    {activityLoading ? (
                      <div className={`flex items-center justify-center gap-2 py-6 text-[12px] ${t.textFaint}`}>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </div>
                    ) : activity.length === 0 ? (
                      <div className={`px-3 py-6 text-center text-[12px] ${t.textFaint}`}>No recent activity</div>
                    ) : activity.map(item => (
                      <div key={item.id} className={`flex items-start gap-2 px-3 py-2 ${t.hoverBgSoft}`}>
                        <item.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${item.status === 'critical' ? 'text-rose-400' : t.textTertiary}`} />
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

        <div className="relative">
          <button
            onClick={() => toggleMenu('feedback')}
            type="button"
            title="Send feedback"
            className={`flex items-center gap-1.5 h-7 px-2 rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Feedback</span>
          </button>
          <AnimatePresence>
            {openMenu === 'feedback' && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute bottom-full right-0 mb-2 w-72 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-20 p-3`}
                >
                  {feedbackSent ? (
                    <div className="py-2">
                      <div className="flex items-center gap-2 text-emerald-500 text-[12.5px] font-medium">
                        <Check className="h-4 w-4" /> Thanks for the feedback!
                      </div>
                      <p className={`text-[10.5px] ${t.textFaint} mt-0.5 ml-6`}>Saved — it won't be lost if you close this tab.</p>
                    </div>
                  ) : (
                    <>
                      <p className={`text-[12.5px] font-medium ${t.textPrimary} mb-1`}>Got a suggestion?</p>
                      <p className={`text-[11px] ${t.textFaint} mb-2`}>Rating this page — {pathname}</p>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setFeedbackRating(n === feedbackRating ? 0 : n)}
                            title={`${n} star${n > 1 ? 's' : ''}`}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <Star
                              className={`h-5 w-5 ${n <= feedbackRating ? 'text-amber-400' : t.textFaint}`}
                              weight={n <= feedbackRating ? 'fill' : 'regular'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={3}
                        placeholder="Tell us what would make this better…"
                        className={`${t.inputBg} rounded-lg w-full text-[12px] p-2 resize-none focus:outline-none`}
                      />
                      <motion.button
                        onClick={sendFeedback}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="button"
                        className={`mt-2 w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white rounded-lg py-1.5 bg-gradient-to-br ${ACCENT.blue.gradient} ${ACCENT.blue.solidGlow}`}
                      >
                        <Send className="h-3.5 w-3.5" /> Send
                      </motion.button>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => toggleMenu('settings')}
            type="button"
            title="Settings"
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <AnimatePresence>
            {openMenu === 'settings' && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setOpenMenu(null); setResetConfirming(false); }} />
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute bottom-full right-0 mb-2 w-72 ${t.glass} rounded-xl ${t.shadow} overflow-hidden z-20`}
                >
                  <button
                    onClick={() => { onOpenPreferences(); setOpenMenu(null); }}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium ${t.textPrimary} ${t.hoverBg} transition-colors`}
                  >
                    <Palette className="h-3.5 w-3.5 text-brand-400" /> Preferences…
                  </button>
                  <div className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide border-t ${t.border} ${t.textFaint}`}>Appearance</div>
                  <button
                    onClick={() => { t.toggle(); setOpenMenu(null); }}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-colors`}
                  >
                    {t.light ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />} Switch to {t.light ? 'dark' : 'light'} mode
                  </button>
                  <button
                    onClick={() => { onToggleSidebarCollapsed(); setOpenMenu(null); }}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-colors`}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
                    {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </button>

                  <div className={`px-3 pt-2.5 pb-1.5 mt-1 text-[11px] font-semibold uppercase tracking-wide border-t ${t.border} ${t.textFaint} flex items-center gap-1.5`}>
                    <TextAa className="h-3 w-3" /> Typography
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 px-3 pb-2.5">
                    {FONT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setFont(opt.id)}
                        type="button"
                        style={{ fontFamily: opt.sample }}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-[12.5px] transition-colors ${
                          font === opt.id ? `${ACCENT.violet.chip} ${ACCENT.violet.text}` : `${t.chipBg} ${t.textMuted} ${t.hoverText} ${t.hoverBg}`
                        }`}
                      >
                        {opt.label}
                        {font === opt.id && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className={`px-3 py-2 mt-1 text-[11px] font-semibold uppercase tracking-wide border-t ${t.border} ${t.textFaint}`}>Dashboard</div>
                  <button
                    onClick={() => { onOpenCustomize(); setOpenMenu(null); }}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-colors`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Customize dashboard
                  </button>
                  {resetConfirming ? (
                    <div className="px-3 py-2.5 space-y-2">
                      <p className={`text-[12px] ${t.textFaint}`}>Reset favorites, quick actions and usage history?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setResetConfirming(false)}
                          type="button"
                          className={`flex-1 text-[12px] font-medium rounded-lg py-1.5 ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { onResetCustomizations(); setResetConfirming(false); setOpenMenu(null); }}
                          type="button"
                          className="flex-1 text-[12px] font-semibold text-white rounded-lg py-1.5 bg-rose-500 hover:bg-rose-400 transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResetConfirming(true)}
                      type="button"
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-rose-500 hover:bg-rose-500/10 transition-colors`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset customizations
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
