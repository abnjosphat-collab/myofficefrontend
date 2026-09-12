'use client';

import { CenterModal, useTheme, TYPE_WEIGHT, uiIconClass } from '@/components/shared/theme';
import { QUICK_ACTIONS } from './modules';
import { useAppShell } from './context';

function ToggleRow({
  icon: Icon, label, hint, checked, onChange,
}: {
  icon: React.ElementType; label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void;
}) {
  const t = useTheme();
  return (
    <label className={`flex items-center gap-3 py-2.5 cursor-pointer rounded-lg px-2 -mx-2 ${t.hoverBgSoft}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500/30"
      />
      <Icon className={`h-4 w-4 shrink-0 ${uiIconClass('neutral', t.light)}`} />
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{label}</div>
        {hint && <div className={`text-[11px] ${t.textFaint} mt-0.5`}>{hint}</div>}
      </div>
    </label>
  );
}

export function QuickActionsManagePanel({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const s = useAppShell();

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      title="Quick actions"
      subtitle="Choose what appears on your homepage. Pin more from any module tile with the + button."
      accent="violet"
      width="max-w-md"
    >
      <div className={`px-5 py-3 space-y-4 max-h-[min(70vh,520px)] overflow-y-auto`}>
        <section>
          <h4 className={`text-[11px] ${TYPE_WEIGHT.semibold} ${t.textTertiary} uppercase tracking-wider mb-1`}>
            Built-in shortcuts
          </h4>
          <div className="space-y-0.5">
            {QUICK_ACTIONS.map(action => (
              <ToggleRow
                key={action.id}
                icon={action.icon}
                label={action.label}
                checked={!s.dismissedBuiltinIds.has(action.id)}
                onChange={(on) => s.setBuiltinQuickActionVisible(action.id, on)}
              />
            ))}
          </div>
        </section>

        {s.customQuickActions.length > 0 && (
          <section>
            <h4 className={`text-[11px] ${TYPE_WEIGHT.semibold} ${t.textTertiary} uppercase tracking-wider mb-1`}>
              Pinned modules
            </h4>
            <div className="space-y-0.5">
              {s.customQuickActions.map(action => (
                <ToggleRow
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  checked={s.quickActionHrefs.has(action.href)}
                  onChange={(on) => { if (on && !s.quickActionHrefs.has(action.href)) s.toggleQuickAction(action.href); else if (!on) s.toggleQuickAction(action.href); }}
                />
              ))}
            </div>
          </section>
        )}

        {s.frequentQuickActions.length > 0 && (
          <section>
            <h4 className={`text-[11px] ${TYPE_WEIGHT.semibold} ${t.textTertiary} uppercase tracking-wider mb-1`}>
              Suggested from usage
            </h4>
            <p className={`text-[11px] ${t.textFaint} mb-2`}>
              Uncheck to hide a suggestion. MyOffice may suggest it again if you keep using that module.
            </p>
            <div className="space-y-0.5">
              {s.frequentQuickActions.map(action => (
                <ToggleRow
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  hint="Frequently used"
                  checked={!s.dismissedAutoHrefs.has(action.href)}
                  onChange={(on) => (on ? s.restoreAutoAction(action.href) : s.dismissAutoAction(action.href))}
                />
              ))}
            </div>
          </section>
        )}

        {s.visibleQuickActions.length === 0 && (
          <p className={`text-[12px] ${t.textMuted} py-2`}>
            No quick actions selected. Turn on a built-in shortcut above or pin a module from the grid below.
          </p>
        )}
      </div>
    </CenterModal>
  );
}
