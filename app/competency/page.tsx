// FILE: app/competency/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { GraduationCap, X, RefreshCw } from 'lucide-react';
import { useTheme, PageHero, StatTile } from '@/components/shared/theme';

const _API = (process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com').replace(/\/$/, '');
const COMP_URL = `${_API}/api/competency`;

type SkillLevel = 0 | 1 | 2 | 3 | 4;

interface Employee { id: number; name: string; trade: string; department: string; skills: Record<string, SkillLevel>; }

const SKILL_AREAS = ['SAG Mill Ops', 'Ball Mill Ops', 'Jaw Crusher', 'Compressor', 'Dewatering', 'Electrical MV', 'Slurry Pumps', 'Rigging & Lifting'];

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
const DEPTS_STATIC = ['Milling', 'Crushing', 'Electrical', 'Dewatering', 'Compressors'];

const LEVEL_HEX: Record<SkillLevel, string> = { 0: '#94a3b8', 1: '#f43f5e', 2: '#f59e0b', 3: '#38bdf8', 4: '#34d399' };
const LEVEL_LABEL: Record<SkillLevel, string> = { 0: 'Not Assessed', 1: 'Awareness', 2: 'Assisted', 3: 'Independent', 4: 'Trainer' };

interface Popover { empId: number; skill: string; x: number; y: number; }

function CompetencyContent() {
  const t = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
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

  const displayed = employees.filter(e => tradeFilter === 'all' || e.trade === tradeFilter).filter(e => deptFilter === 'all' || e.department === deptFilter);
  const fullyQualified = employees.filter(e => Object.values(e.skills).every(v => v >= 3)).length;
  const needsRenewal = employees.filter(e => Object.values(e.skills).some(v => v === 1)).length;

  const handleCellClick = (empId: number, skill: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPopover({ empId, skill, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  };

  const setSkill = async (level: SkillLevel) => {
    if (!popover) return;
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
    setEmployees(prev => prev.map(e => e.id === popover.empId ? { ...e, skills: { ...e.skills, [popover.skill]: level } } : e));
    setPopover(null);
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {popover && (
        <div className="fixed inset-0 z-50" onClick={() => setPopover(null)}>
          <div className={`absolute rounded-xl p-2 ${t.glass} ${t.shadow}`} style={{ left: Math.min(popover.x - 80, window.innerWidth - 200), top: popover.y }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className={`text-xs font-medium ${t.textMuted}`}>{popover.skill}</span>
              <button type="button" onClick={() => setPopover(null)} className={`${t.textFaint} ${t.hoverText}`}><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1">
              {([0, 1, 2, 3, 4] as SkillLevel[]).map(l => (
                <button key={l} type="button" onClick={() => setSkill(l)} className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg ${t.hoverBg} transition-colors text-left`}>
                  <span className="w-4 h-4 rounded flex-shrink-0" style={{ background: LEVEL_HEX[l] }} />
                  <span className={`text-xs ${t.textMuted}`}>{l} — {LEVEL_LABEL[l]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PageHero
        icon={GraduationCap}
        accent="violet"
        crumbs={['Core Management', 'Competency Matrix']}
        title="Competency Matrix"
        description="Employee skills and equipment qualification tracking"
        statsOpen
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={GraduationCap} color="#86BBD8" label="Total Assessed" value={employees.length} />
          <StatTile icon={GraduationCap} color="#34d399" label="Fully Certified" value={fullyQualified} />
          <StatTile icon={GraduationCap} color="#f59e0b" label="Need Renewal" value={needsRenewal} />
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4`}>
        <div className="flex gap-2 flex-wrap">
          <div>
            <span className={`text-xs mr-2 ${t.textFaint}`}>Trade:</span>
            {['all', ...TRADES_STATIC].map(tr => (
              <button key={tr} type="button" onClick={() => setTradeFilter(tr)}
                className={`mr-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${tradeFilter === tr ? 'bg-blue-500/20 text-blue-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                {tr === 'all' ? 'All' : tr}
              </button>
            ))}
          </div>
          <div>
            <span className={`text-xs mr-2 ${t.textFaint}`}>Dept:</span>
            {['all', ...DEPTS_STATIC].map(d => (
              <button key={d} type="button" onClick={() => setDeptFilter(d)}
                className={`mr-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${deptFilter === d ? 'bg-blue-500/20 text-blue-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                {d === 'all' ? 'All' : d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`border-b ${t.border}`}>
              <th className={`px-4 py-3 text-left text-xs font-medium sticky left-0 ${t.textFaint}`}>Employee</th>
              {SKILL_AREAS.map(s => <th key={s} className={`px-3 py-3 text-center text-xs font-medium whitespace-nowrap ${t.textFaint}`}>{s}</th>)}
            </tr></thead>
            <tbody className={`divide-y ${t.divide}`}>
              {loading ? (
                <tr><td colSpan={20} className="text-center py-10"><RefreshCw className={`h-5 w-5 animate-spin mx-auto ${t.textFaint}`} /></td></tr>
              ) : displayed.map(emp => (
                <tr key={emp.id} className={`${t.hoverBg} transition-colors`}>
                  <td className="px-4 py-3 sticky left-0">
                    <div className={`font-medium text-sm ${t.textPrimary}`}>{emp.name}</div>
                    <div className={`text-xs ${t.textFaint}`}>{emp.trade} · {emp.department}</div>
                  </td>
                  {SKILL_AREAS.map(skill => {
                    const level = emp.skills[skill] as SkillLevel ?? 0;
                    const hex = LEVEL_HEX[level];
                    return (
                      <td key={skill} className="px-3 py-3 text-center">
                        <button type="button" title={`${emp.name} — ${skill}: ${LEVEL_LABEL[level]}. Click to edit.`} onClick={e => handleCellClick(emp.id, skill, e)}
                          className="w-8 h-8 rounded-lg hover:ring-2 hover:ring-blue-400/40 transition-all mx-auto flex items-center justify-center" style={{ background: `${hex}${level === 0 ? '20' : 'cc'}` }}>
                          {level > 0 && <span className="text-[10px] font-bold text-white">{level}</span>}
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

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4`}>
        <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Skill Level Legend</div>
        <div className="flex flex-wrap gap-4">
          {([0, 1, 2, 3, 4] as SkillLevel[]).map(l => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${LEVEL_HEX[l]}${l === 0 ? '20' : 'cc'}` }}>
                {l > 0 && <span className="text-[10px] font-bold text-white">{l}</span>}
              </span>
              <span className={`text-xs ${t.textMuted}`}>{l} — {LEVEL_LABEL[l]}</span>
            </div>
          ))}
        </div>
        <p className={`text-xs mt-3 ${t.textFaint}`}>Click any cell to update the skill level for that employee and skill area.</p>
      </div>
    </main>
  );
}

export default function CompetencyPage() {
  return <AppShell><CompetencyContent /></AppShell>;
}
