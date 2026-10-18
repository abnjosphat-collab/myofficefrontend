// app/compressors/UnitPod.tsx — one compressor on the floor: status lamp and fan, hour meter, service-life ring
// and whether today's reading is in. The whole pod is one button that opens the unit drawer.
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui-system';
import { STATUS_META, hours } from './meta';
import type { Compressor } from './types';
import { AnimatedText, CountUp, Fan, Ring, Slab } from '@/components/shared/floor/motion';
import { serviceLife, statusAccent, type ServiceLife } from './floorLogic';
import s from '@/components/shared/floor/floor.module.css';

export function UnitPod({ compressor, recordedToday, justSaved, kick, index, onOpen }: {
  compressor: Compressor; recordedToday: boolean; justSaved: boolean; kick: number; index: number; onOpen: () => void;
}) {
  const reduced = useReducedMotion();
  const accent = statusAccent(compressor.status);
  const life: ServiceLife = serviceLife(compressor.total_running_hours);
  const status = STATUS_META[compressor.status]?.label ?? compressor.status;
  const efficiency = compressor.total_running_hours ? (compressor.total_loaded_hours / compressor.total_running_hours) * 100 : null;
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reduced ? 0 : Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
    >
      <Slab
        accent={accent}
        className={`group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-focus ${justSaved ? s.saved : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${compressor.name}, ${status}, ${hours(compressor.total_running_hours)} running. ${recordedToday ? 'Reading recorded today.' : 'Reading due today.'} Open to record a reading.`}
        onClick={onOpen}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      >
        <div className="flex flex-col gap-4 p-4">
          <header className={`flex items-start gap-3`}>
            <span className={s.well}><Fan running={compressor.status === 'running'} kick={kick} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-body font-medium text-ink">{compressor.name}</p>
              <p className="truncate font-sans text-caption text-ink-muted">{[compressor.equipment_code, compressor.model, compressor.location].filter(Boolean).join(' · ')}</p>
            </div>
            <span className="flex items-center gap-2 pt-1 font-sans text-caption font-medium text-ink-muted">
              <span className={s.lamp} data-state={compressor.status} /><AnimatedText text={status} />
            </span>
          </header>

          <div className={`flex items-end justify-between gap-3`}>
            <div>
              <p className="font-sans text-caption text-ink-muted">Running hours</p>
              <p className="floor-meter text-readout font-medium leading-none" style={{ color: accent }}>
                <CountUp value={compressor.total_running_hours} decimals={1} /><span className="ml-1 text-body font-medium text-ink-muted">h</span>
              </p>
              <p className="mt-1 font-sans text-caption text-ink-muted">
                Loaded {hours(compressor.total_loaded_hours)}{efficiency != null && ` · ${efficiency.toFixed(0)}% loaded`}
              </p>
            </div>
            <Ring
              fraction={life.fraction}
              accent={life.tone}
              urgent={life.urgent}
              label={life.next ? `Service life: ${Math.round(life.fraction * 100)}% of the way to the ${life.next} hour service` : 'Every planned service interval has passed'}
            >
              <span className="font-sans text-caption font-semibold text-ink tabular">{life.next ? `${Math.round(life.fraction * 100)}%` : '—'}</span>
            </Ring>
          </div>

          <footer className={`flex items-center justify-between gap-2 border-t border-line-subtle pt-3`}>
            <span className="font-sans text-caption text-ink-muted">
              {life.next ? <>Next: <span className="font-medium text-ink">{life.next} h</span> in {life.hoursLeft?.toFixed(0)} h</> : 'All planned services passed'}
            </span>
            {recordedToday
              ? <span className="inline-flex items-center gap-1 font-sans text-caption font-medium" style={{ color: 'var(--mo-success)' }}><Icon name="success" size="xs" />Recorded</span>
              : <span className="inline-flex items-center gap-1 font-sans text-caption font-medium text-ink-muted transition-colors group-hover:text-ink"><Icon name="edit" size="xs" />Reading due</span>}
          </footer>
        </div>
      </Slab>
    </motion.div>
  );
}
