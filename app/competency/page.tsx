// FILE: app/competency/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/PageShell';
import { GraduationCap, X, RefreshCw } from 'lucide-react';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const COMP_URL = `${_API}/api/competency`;

type SkillLevel = 0 | 1 | 2 | 3 | 4;

interface Employee {
  id: number; name: string; trade: string; department: string;
  skills: Record<string, SkillLevel>;
}

const SKILL_AREAS = [
  'SAG Mill Ops', 'Ball Mill Ops', 'Jaw Crusher', 'Compressor', 'Dewatering', 'Electrical MV', 'Slurry Pumps', 'Rigging & Lifting',
];

// Pivot flat DB rows (one per employee×skill) into grid format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pivotFromAPI(rows: any[]): Employee[] {
  const map = new Map<string, Employee>();
  for (const r of rows) {
    const key = r.employee_id;
    if (!map.has(key)) map.set(key, { id: r.id, name: r.employee_name, trade: r.trade || '', department: r.trade || '', skills: {} });
    map.get(key)!.skills[r.skill_area || r.equipment_type] = (r.skill_level ?? 0) as SkillLevel;
  }
  return Array.from(map.values());
}

const TRADES_STATIC = ['Millwright', 'Electrician', 'Fitter', 'Instrumentation'];
const DEPTS_STATIC  = ['Milling', 'Crushing', 'Electrical', 'Dewatering', 'Compressors'];

const LEVEL_CONFIG: Record<SkillLevel, { bg: string; label: string; text: string }> = {
  0: { bg: 'bg-white/10', label: 'Not Assessed', text: 'text-white/20' },
  1: { bg: 'bg-rose-500/60', label: 'Awareness', text: 'text-rose-200' },
  2: { bg: 'bg-amber-500/60', label: 'Assisted', text: 'text-amber-200' },
  3: { bg: 'bg-sky-500/60', label: 'Independent', text: 'text-sky-200' },
  4: { bg: 'bg-emerald-500/70', label: 'Trainer', text: 'text-emerald-200' },
};

interface Popover { empId: number; skill: string; x: number; y: number; }

export default function CompetencyPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  // Raw API rows kept for update operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawRows, setRawRows] = useState<any[]>([]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(COMP_URL);
      if (r.ok) { const rows = await r.json(); setRawRows(rows); setEmployees(pivotFromAPI(rows)); }
    } catch { /* network */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  const [tradeFilter, setTradeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [popover, setPopover] = useState<Popover | null>(null);

  const displayed = employees
    .filter(e => tradeFilter === 'all' || e.trade === tradeFilter)
    .filter(e => deptFilter === 'all' || e.department === deptFilter);

  const fullyQualified = employees.filter(e => Object.values(e.skills).every(v => v >= 3)).length;
  const needsRenewal = employees.filter(e => Object.values(e.skills).some(v => v === 1)).length;

  const handleCellClick = (empId: number, skill: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPopover({ empId, skill, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  };

  const setSkill = async (level: SkillLevel) => {
    if (!popover) return;
    // Find the matching row in rawRows to get its id, or POST if new
    const existing = rawRows.find((r: any) => r.employee_id === String(popover.empId) && (r.skill_area === popover.skill || r.equipment_type === popover.skill));
    const emp = employees.find(e => e.id === popover.empId);
    try {
      if (existing) {
        await fetch(`${COMP_URL}/${existing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skill_level: level }) });
      } else if (emp) {
        await fetch(COMP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: String(emp.id), employee_name: emp.name, trade: emp.trade, equipment_type: popover.skill, skill_area: popover.skill, skill_level: level }) });
      }
      fetchEmployees();
    } catch { /* ignore */ }
    // Optimistic local update
    setEmployees(prev => prev.map(e => e.id === popover.empId ? { ...e, skills: { ...e.skills, [popover.skill]: level } } : e));
    setPopover(null);
  };

  return (
    <PageShell>
      {/* Popover */}
      {popover && (
        <div className="fixed inset-0 z-50" onClick={() => setPopover(null)}>
          <div className="absolute bg-[#0f1e2e] border border-white/15 rounded-xl p-2 shadow-xl" style={{ left: Math.min(popover.x - 80, window.innerWidth - 200), top: popover.y }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-white/60 text-xs font-medium">{popover.skill}</span>
              <button onClick={() => setPopover(null)} className="text-white/30 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1">
              {([0, 1, 2, 3, 4] as SkillLevel[]).map(l => (
                <button key={l} onClick={() => setSkill(l)} className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-left`}>
                  <span className={`w-4 h-4 rounded ${LEVEL_CONFIG[l].bg} flex-shrink-0`} />
                  <span className="text-xs text-white/70">{l} — {LEVEL_CONFIG[l].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden p-6">
            <div className="flex items-center gap-3 mb-5">
              <GraduationCap className="w-7 h-7 text-[#86BBD8]" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Competency Matrix</h1>
                <p className="text-white/50 text-sm mt-0.5">Employee skills and equipment qualification tracking</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[['Total Assessed', employees.length, 'text-white'], ['Fully Certified', fullyQualified, 'text-emerald-300'], ['Need Renewal', needsRenewal, 'text-amber-300']].map(([l, v, c]) => (
                <div key={String(l)} className="bg-white/[0.06] rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${c}`}>{v}</div>
                  <div className="text-white/50 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-4">
        <div className="oz-glass-panel rounded-2xl overflow-hidden p-4">
          <div className="flex gap-2 flex-wrap">
            <div>
              <span className="text-white/40 text-xs mr-2">Trade:</span>
              {['all', ...TRADES_STATIC].map(t => (
                <button key={t} onClick={() => setTradeFilter(t)} className={`mr-1 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${tradeFilter === t ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>
            <div>
              <span className="text-white/40 text-xs mr-2">Dept:</span>
              {['all', ...DEPTS_STATIC].map(d => (
                <button key={d} onClick={() => setDeptFilter(d)} className={`mr-1 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${deptFilter === d ? 'bg-[#86BBD8]/25 border-[#86BBD8]/40 text-white' : 'bg-white/[0.05] border-white/10 text-white/50 hover:text-white'}`}>
                  {d === 'all' ? 'All' : d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-6">
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-white/40 text-xs font-medium sticky left-0 bg-transparent">Employee</th>
                  {SKILL_AREAS.map(s => (
                    <th key={s} className="px-3 py-3 text-center text-white/40 text-xs font-medium whitespace-nowrap">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr><td colSpan={20} className="text-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-white/30 mx-auto" /></td></tr>
                ) : displayed.map(emp => (
                  <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 sticky left-0">
                      <div className="text-white font-medium text-sm">{emp.name}</div>
                      <div className="text-white/40 text-xs">{emp.trade} · {emp.department}</div>
                    </td>
                    {SKILL_AREAS.map(skill => {
                      const level = emp.skills[skill] as SkillLevel ?? 0;
                      const cfg = LEVEL_CONFIG[level];
                      return (
                        <td key={skill} className="px-3 py-3 text-center">
                          <button
                            title={`${emp.name} — ${skill}: ${cfg.label}. Click to edit.`}
                            onClick={e => handleCellClick(emp.id, skill, e)}
                            className={`w-8 h-8 rounded-lg ${cfg.bg} hover:ring-2 hover:ring-white/30 transition-all mx-auto flex items-center justify-center`}
                          >
                            {level > 0 && <span className={`text-[10px] font-bold ${cfg.text}`}>{level}</span>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="container mx-auto px-4 pb-8">
        <div className="oz-glass-panel rounded-2xl p-4">
          <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Skill Level Legend</div>
          <div className="flex flex-wrap gap-4">
            {([0, 1, 2, 3, 4] as SkillLevel[]).map(l => (
              <div key={l} className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded ${LEVEL_CONFIG[l].bg} flex items-center justify-center`}>
                  {l > 0 && <span className={`text-[10px] font-bold ${LEVEL_CONFIG[l].text}`}>{l}</span>}
                </span>
                <span className="text-white/60 text-xs">{l} — {LEVEL_CONFIG[l].label}</span>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-3">Click any cell to update the skill level for that employee and skill area.</p>
        </div>
      </section>
    </PageShell>
  );
}
