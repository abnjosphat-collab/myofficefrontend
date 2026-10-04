'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedText, tileEmergeProps } from './ToolsUI';
import { ToolsIcon as Icon, type IconName } from './ToolsIcon';
import type { Status } from './prototype';
import type { ToolsTab } from './toolSelectors';
import s from './tools.module.css';

export type HomepageStat = { key: string; label: string; value: number; icon: IconName; tab: ToolsTab; filter: Status | 'all'; tone?: 'amber' | 'red'; unavailable?: boolean; loading?: boolean };
export type HomepageAttention = { id: string; tone: 'amber' | 'red'; title: string; detail: string; tab: ToolsTab };
export type HomepageMovement = { id: string; title: string; detail: string; time: string };
export type HomepageSection = { value: ToolsTab; label: string; icon: IconName };

const SECTION_DESCRIPTIONS: Partial<Record<ToolsTab, string>> = {
  register: 'Browse every tool and its live status',
  loans: 'Track custody and overdue returns',
  employees: 'People who can receive equipment',
  compliance: 'Competence, inspections and incidents',
  activity: 'Issue and return audit trail',
  sources: 'Original registers and scans',
  accounts: 'Roles and department access',
  analytics: 'Usage, errors and feedback',
  feedback: 'Suggestions and recordings',
};

export function ToolsHomepage({ stats, attention, movements, historyFailed, attentionFailed, historyLoading = false, attentionLoading = false, sections, scopeLabel, onNavigate, onRetry }: {
  stats: HomepageStat[];
  attention: HomepageAttention[];
  movements: HomepageMovement[];
  historyFailed: boolean;
  attentionFailed: boolean;
  /** The panel's own records are still on their way; the rest of the overview is already usable. */
  historyLoading?: boolean;
  attentionLoading?: boolean;
  sections: HomepageSection[];
  scopeLabel: string;
  onNavigate: (tab: ToolsTab, filter: Status | 'all') => void;
  onRetry: () => void;
}) {
  const reduced = useReducedMotion();
  return <div className={s.homepage}>
    <div className={s.homeHeader}><div><h2>Overview</h2><p className={s.homeScope}>{scopeLabel}</p></div></div>
    <div className={s.homeStats}>{stats.map((stat, i) => stat.loading
      ? <motion.div key={stat.key} className={s.homeStat} aria-busy="true" aria-label={`${stat.label}, loading`} {...tileEmergeProps(i, reduced)}><span className={s.homeStatIcon}><Icon name={stat.icon} size={18} /></span><div><strong>—</strong><span>{stat.label}</span><small>Loading…</small></div></motion.div>
      : stat.unavailable
      ? <motion.div key={stat.key} className={s.homeStat} data-unavailable="true" aria-label={`${stat.label} unavailable`} {...tileEmergeProps(i, reduced)}><span className={s.homeStatIcon}><Icon name={stat.icon} size={18} /></span><div><strong>—</strong><span>{stat.label}</span><small>Unavailable</small></div><button className={s.textButton} onClick={onRetry}>Retry</button></motion.div>
      : <motion.button key={stat.key} className={s.homeStat} data-tone={stat.tone} onClick={() => onNavigate(stat.tab, stat.filter)} aria-label={`${stat.label}: ${stat.value}`} {...tileEmergeProps(i, reduced)}><span className={s.homeStatIcon}><Icon name={stat.icon} size={18} /></span><div><strong><AnimatedText value={stat.value}>{stat.value}</AnimatedText></strong><span>{stat.label}</span></div><Icon name="chevron" size={15} /></motion.button>)}
    </div>
    <div className={s.homeColumns}>
      <motion.section className={s.homePanel} aria-label="Needs attention" {...tileEmergeProps(stats.length, reduced)}><div className={s.homePanelHeader}><h3><Icon name="alert" size={15} />Needs attention</h3>{attention.length > 0 && <small>{attention.length}</small>}</div>
        {attentionLoading ? <div className={s.homeEmpty} role="status"><p>Loading the latest records…</p></div>
          : attentionFailed ? <div className={s.homeEmpty}><Icon name="alert" size={22} /><p>Needs-attention data is unavailable.</p><button className={s.textButton} onClick={onRetry}>Retry</button></div>
          : attention.length ? <div className={s.homeAttention}>{attention.map(item => <button key={item.id} data-tone={item.tone} onClick={() => onNavigate(item.tab, 'all')}><i /><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" size={15} /></button>)}</div>
            : <div className={s.homeEmpty}><Icon name="check" size={22} /><p>Everything is clear. No overdue returns, open incidents or due checks.</p></div>}
      </motion.section>
      <motion.section className={s.homePanel} aria-label="Recent movements" {...tileEmergeProps(stats.length + 1, reduced)}><div className={s.homePanelHeader}><h3><Icon name="history" size={15} />Recent movements</h3><button className={s.textButton} onClick={() => onNavigate('activity', 'all')}>View all<Icon name="out" size={14} /></button></div>
        {historyLoading ? <div className={s.homeEmpty} role="status"><p>Loading the latest records…</p></div>
          : historyFailed ? <div className={s.homeEmpty}><Icon name="alert" size={22} /><p>Movement history is unavailable.</p><button className={s.textButton} onClick={onRetry}>Retry</button></div>
          : movements.length ? <div className={s.homeMoves}>{movements.map(item => <button key={item.id} onClick={() => onNavigate('activity', 'all')}><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.time}</time></button>)}</div>
            : <div className={s.homeEmpty}><Icon name="history" size={22} /><p>No movements recorded yet.</p></div>}
      </motion.section>
    </div>
    <nav className={s.homeShortcuts} aria-label="Workspace shortcuts"><div className={s.homeShortcutsHeader}><h3>Workspace shortcuts</h3></div><div className={s.homeSections}>{sections.map((section, i) => <motion.button key={section.value} className={s.homeSection} aria-label={`Open ${section.label}`} title={SECTION_DESCRIPTIONS[section.value] ?? section.label} onClick={() => onNavigate(section.value, 'all')} {...tileEmergeProps(stats.length + 2 + i, reduced)}><span className={s.homeStatIcon}><Icon name={section.icon} size={16} /></span><span><strong>{section.label}</strong></span><Icon name="chevron" size={14} /></motion.button>)}
    </div></nav>
  </div>;
}
