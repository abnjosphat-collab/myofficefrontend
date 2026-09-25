'use client';

import { CalendarDays, Check, User, X } from '@/components/shared/theme';
import { useTheme, TYPE_WEIGHT, Button } from '@/components/shared/theme';
import { TableCell } from '@/components/ui/table';
import type { Employee } from './types';
import s from './timesheet-grid.module.css';

export function TimesheetEmployeeCell({
  emp, stickyBg, confirmRemoveId, setConfirmRemoveId, selected, onToggleSelect, onBulkAssign, onRemoveEmployee,
}: {
  emp: Employee;
  stickyBg: string;
  confirmRemoveId: string | null;
  setConfirmRemoveId: (id: string | null) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onBulkAssign: (emp: Employee) => void;
  onRemoveEmployee: (id: string) => void;
}) {
  const t = useTheme();
  const quiet = t.design === 'dallaglio';

  return (
    <TableCell className={`sticky left-0 z-20 ${stickyBg} border-r ${t.border} py-0 group/emp shadow-[2px_0_0_0_rgba(0,0,0,0.03)] dark:shadow-[2px_0_0_0_rgba(255,255,255,0.03)]`}>
      <div className={`relative py-2 ${quiet ? s.empCell : ''}`}>
        {confirmRemoveId === emp.id ? (
          <div className={`absolute top-1 right-1 flex items-center gap-1 z-20 ${quiet ? `${t.chipBg} rounded-lg px-2 py-1` : `${t.glass} rounded-lg px-1.5 py-1 border border-red-500/30`}`}>
            <span className={`text-[10px] ${quiet ? t.textMuted : 'text-red-400'} mr-0.5`}>Remove from period?</span>
            <button type="button" title="Confirm remove from this period" onClick={() => { onRemoveEmployee(emp.id); setConfirmRemoveId(null); }} className={`h-6 w-6 flex items-center justify-center rounded ${quiet ? t.hoverBg : 'bg-red-500/20'} text-red-400 hover:bg-red-500/20 transition-all`}><Check className="w-3 h-3" /></button>
            <button type="button" title="Cancel" onClick={() => setConfirmRemoveId(null)} className={`h-6 w-6 flex items-center justify-center rounded ${t.chipBg} ${t.textFaint} ${t.hoverBg} transition-all`}><X className="w-3 h-3" /></button>
          </div>
        ) : quiet ? (
          <button
            type="button"
            title="Remove employee from this period (not a single day's entry)"
            aria-label={`Remove ${emp.name} from this period`}
            onClick={() => setConfirmRemoveId(emp.id)}
            className={`${s.empRemove} absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}
          >
            Remove from period
          </button>
        ) : (
          <button type="button" title="Remove employee from this period" aria-label={`Remove ${emp.name} from this period`}
            onClick={() => setConfirmRemoveId(emp.id)}
            className="absolute top-1.5 right-1.5 h-7 w-7 flex items-center justify-center rounded-full opacity-50 group-hover/emp:opacity-100 focus-visible:opacity-100 bg-red-500/[0.08] text-red-400/70 hover:bg-red-500/20 hover:text-red-400 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40">
            <X className="w-3 h-3" />
          </button>
        )}
        <div className={`flex items-center gap-2 ${quiet ? 'pr-2' : 'pr-5'}`}>
          <input
            type="checkbox"
            aria-label={`Select ${emp.name} for bulk assign`}
            checked={selected}
            onChange={() => onToggleSelect(emp.id)}
            onClick={e => e.stopPropagation()}
            className="rounded accent-brand-500 shrink-0"
          />
          <User className={`h-5 w-5 shrink-0 ${quiet ? t.textFaint : 'text-brand-400'}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${quiet ? 'font-normal' : TYPE_WEIGHT.medium} truncate leading-tight ${t.textPrimary}`}>{emp.name}</p>
            <p className={`text-xs truncate mt-0.5 ${t.textFaint}`}>{emp.position}</p>
            <div className="mt-1.5 flex items-center gap-1">
              {quiet ? (
                <Button type="button" variant="ghost" size="xs" icon={CalendarDays} title="Bulk assign shifts for this employee" onClick={() => onBulkAssign(emp)}>
                  <span className="hidden lg:inline">Assign shifts</span>
                </Button>
              ) : (
                <button type="button" title="Bulk assign shifts for this employee" aria-label={`Assign shifts for ${emp.name}`} onClick={() => onBulkAssign(emp)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-500/10 text-brand-400/80 hover:bg-brand-500/20 hover:text-brand-400 transition-all duration-150 group/bulk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40">
                  <CalendarDays className="w-3 h-3 group-hover/bulk:scale-110 transition-transform shrink-0" /><span className="tracking-wide hidden lg:inline">Assign shifts</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </TableCell>
  );
}
