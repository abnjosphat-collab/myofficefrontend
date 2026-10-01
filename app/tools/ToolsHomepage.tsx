'use client';

import { AnimatedText } from './ToolsUI';
import { ToolsIcon as Icon, type IconName } from './ToolsIcon';
import type { Status } from './prototype';
import type { ToolsTab } from './toolSelectors';
import s from './tools.module.css';

export type HomepageStat = { key: string; label: string; value: number; icon: IconName; tab: ToolsTab; filter: Status | 'all'; tone?: 'amber' | 'red'; unavailable?: boolean };
export type HomepageAttention = { id: string; tone: 'amber' | 'red'; title: string; detail: string; tab: ToolsTab };
export type HomepageMovement = { id: string; title: string; detail: string; time: string };
export type HomepageSection = { value: ToolsTab; label: string; icon: IconName };

const SECTION_DESCRIPTIONS: Partial<Record<ToolsTab, string>> = {
  register: 'Browse every tool and its live status',
  loans: 'Track custody and overdue returns',
  employees: 'People who can receive equipment',
  compliance: 'Competence, inspections and incidents',
  'gate-passes': 'Approve equipment movements',
  activity: 'Issue and return audit trail',
  sources: 'Original registers and scans',
  accounts: 'Roles and department access',
  analytics: 'Usage, errors and feedback',
  feedback: 'Suggestions and recordings',
};

export function ToolsHomepage({ stats, attention, movements, historyFailed, sections, contextLine, onNavigate, onRetry }: {
  stats: HomepageStat[];
  attention: HomepageAttention[];
  movements: HomepageMovement[];
  historyFailed: boolean;
  sections: HomepageSection[];
  contextLine: string;
  onNavigate: (tab: ToolsTab, filter: Status | 'all') => void;
  onRetry: () => void;
}) {
  return <div className={s.homepage}>
    <div className={s.homeHeader}><div><h2>Homepage</h2><p>Your equipment operation in one place — custody, compliance and movements, live from the register.</p><p className={s.homeScope}>{contextLine}</p></div></div>
    <div className={s.homeStats}>{stats.map(stat => stat.unavailable
      ? <div key={stat.key} className={s.homeStat} data-unavailable="true" aria-label={`${stat.label} unavailable`}><span className={s.homeStatIcon}><Icon name={stat.icon} size={18} /></span><div><strong>—</strong><span>{stat.label}</span><small>Unavailable</small></div><button className={s.textButton} onClick={onRetry}>Retry</button></div>
      : <button key={stat.key} className={s.homeStat} data-tone={stat.tone} onClick={() => onNavigate(stat.tab, stat.filter)} aria-label={`${stat.label}: ${stat.value}`}><span className={s.homeStatIcon}><Icon name={stat.icon} size={18} /></span><div><strong><AnimatedText value={stat.value}>{stat.value}</AnimatedText></strong><span>{stat.label}</span></div><Icon name="chevron" size={15} /></button>)}
    </div>
    <nav className={s.homeSections} aria-label="Sections">{sections.map(section => <button key={section.value} className={s.homeSection} aria-label={`Open ${section.label}`} onClick={() => onNavigate(section.value, 'all')}><span className={s.homeStatIcon}><Icon name={section.icon} size={18} /></span><span><strong>{section.label}</strong><small>{SECTION_DESCRIPTIONS[section.value] ?? section.label}</small></span><Icon name="chevron" size={15} /></button>)}
    </nav>
    <div className={s.homeColumns}>
      <section className={s.homePanel} aria-label="Needs attention"><div className={s.homePanelHeader}><h3>Needs attention</h3>{attention.length > 0 && <small>{attention.length}</small>}</div>
        {attention.length ? <div className={s.homeAttention}>{attention.map(item => <button key={item.id} data-tone={item.tone} onClick={() => onNavigate(item.tab, 'all')}><i /><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" size={15} /></button>)}</div>
          : <div className={s.homeEmpty}><Icon name="check" size={22} /><p>Everything is clear. No overdue returns, open incidents or due checks.</p></div>}
      </section>
      <section className={s.homePanel} aria-label="Recent movements"><div className={s.homePanelHeader}><h3>Recent movements</h3><button className={s.textButton} onClick={() => onNavigate('activity', 'all')}>View all<Icon name="out" size={14} /></button></div>
        {historyFailed ? <div className={s.homeEmpty}><Icon name="alert" size={22} /><p>Movement history is unavailable.</p><button className={s.textButton} onClick={onRetry}>Retry</button></div>
          : movements.length ? <div className={s.homeMoves}>{movements.map(item => <button key={item.id} onClick={() => onNavigate('activity', 'all')}><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.time}</time></button>)}</div>
            : <div className={s.homeEmpty}><Icon name="history" size={22} /><p>No movements recorded yet.</p></div>}
      </section>
    </div>
  </div>;
}
