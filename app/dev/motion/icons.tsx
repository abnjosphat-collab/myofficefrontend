// app/dev/motion/icons.tsx — gallery sections for springs, animated icons and
// icon swaps. Client demos only; no app behaviour lives here.
'use client';

import { useState } from 'react';
import {
  AnimatedIcon, Button, IconSwap, Panel, Presence, SPRING, cn, type SpringName,
} from '@/components/ui-system';

const SPRING_TIMING: Record<SpringName, string> = {
  smooth: 'duration-[var(--mo-spring-smooth-duration)] ease-spring-smooth',
  gentle: 'duration-[var(--mo-spring-gentle-duration)] ease-spring-gentle',
  snappy: 'duration-[var(--mo-spring-snappy-duration)] ease-spring-snappy',
  quick: 'duration-[var(--mo-spring-quick-duration)] ease-spring-quick',
};

function SpringRow({ name }: { name: SpringName }) {
  const [out, setOut] = useState(false);
  const preset = SPRING[name];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-40 flex-1">
        <p className="font-sans text-label font-medium text-ink">{name}</p>
        <p className="font-sans text-caption text-ink-muted tabular">
          {preset.visualDuration} s · bounce {preset.bounce}
        </p>
      </div>
      <div className="flex h-8 w-44 items-center rounded-control bg-surface-muted px-2" aria-hidden="true">
        <span className={cn('block size-4 rounded-full bg-action transition-transform', SPRING_TIMING[name], out && 'translate-x-32')} />
      </div>
      <Button size="sm" onClick={() => setOut(v => !v)}>Replay {name}</Button>
    </div>
  );
}

export function SpringsSection() {
  return (
    <Panel title="Springs" description="The four presets and their generated CSS curves. The dot runs on the CSS spring alone; every framer piece below runs on the matching preset.">
      <div className="flex flex-col gap-4">
        <SpringRow name="smooth" />
        <SpringRow name="gentle" />
        <SpringRow name="snappy" />
        <SpringRow name="quick" />
        <p className="font-sans text-caption text-ink-muted">FADE (0.15 s ease-out) is the reduced-motion swap; SPIN (0.5 s linear loop) drives spinners only. The highlight wash (1.2 s) is the sole documented cap exception.</p>
      </div>
    </Panel>
  );
}

function DemoRow({ label, hint, control, visual }: { label: string; hint: string; control: React.ReactNode; visual: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-40 flex-1">
        <p className="font-sans text-label font-medium text-ink">{label}</p>
        <p className="font-sans text-caption text-ink-muted">{hint}</p>
      </div>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface-raised">{visual}</span>
      {control}
    </div>
  );
}

export function AnimatedIconSection() {
  const [bounces, setBounces] = useState(0);
  const [wiggles, setWiggles] = useState(0);
  const [repeats, setRepeats] = useState(0);
  const [pulse, setPulse] = useState(true);
  const [rotate, setRotate] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [selected, setSelected] = useState(true);
  const [badge, setBadge] = useState(true);
  return (
    <Panel title="Animated icons" description="One meaning per effect. Discrete effects fire on change, never on mount; indefinite effects run while their condition holds.">
      <div className="flex flex-col gap-4">
        <DemoRow label="bounce" hint="it happened / it arrived" control={<Button size="sm" onClick={() => setBounces(n => n + 1)}>Notify</Button>} visual={<AnimatedIcon name="bell" effect="bounce" trigger={bounces} size="md" />} />
        <DemoRow label="bounce ×3" hint="optional repeat count, never forever" control={<Button size="sm" onClick={() => setRepeats(n => n + 1)}>Fire ×3</Button>} visual={<AnimatedIcon name="check" effect="bounce" trigger={repeats} repeat={2} size="md" />} />
        <DemoRow label="wiggle" hint="a next step you might overlook" control={<Button size="sm" onClick={() => setWiggles(n => n + 1)}>Validate</Button>} visual={<AnimatedIcon name="warning" effect="wiggle" trigger={wiggles} size="md" />} />
        <DemoRow label="pulse" hint="ongoing activity" control={<Button size="sm" aria-pressed={pulse} onClick={() => setPulse(v => !v)}>{pulse ? 'Stop' : 'Start'}</Button>} visual={<AnimatedIcon name="sync" effect="pulse" active={pulse} size="md" />} />
        <DemoRow label="rotate" hint="a task in progress (spinners only)" control={<Button size="sm" aria-pressed={rotate} onClick={() => setRotate(v => !v)}>{rotate ? 'Stop' : 'Start'}</Button>} visual={<AnimatedIcon name="sync" effect="rotate" active={rotate} size="md" />} />
        <DemoRow label="connecting" hint="trying to reach the server" control={<Button size="sm" aria-pressed={connecting} onClick={() => setConnecting(v => !v)}>{connecting ? 'Stop' : 'Start'}</Button>} visual={<AnimatedIcon name="sync" effect="connecting" active={connecting} size="md" />} />
        <DemoRow label="scale" hint="this is the selected one (persists)" control={<Button size="sm" aria-pressed={selected} onClick={() => setSelected(v => !v)}>{selected ? 'Deselect' : 'Select'}</Button>} visual={<AnimatedIcon name="check" effect="scale" active={selected} size="md" />} />
        <DemoRow label="appear / disappear" hint="it came or went (presence)" control={<Button size="sm" aria-pressed={badge} onClick={() => setBadge(v => !v)}>{badge ? 'Hide' : 'Show'}</Button>} visual={<Presence visible={badge}><AnimatedIcon name="starred" effect="appear" size="md" /></Presence>} />
      </div>
    </Panel>
  );
}

export function IconSwapSection() {
  const [step, setStep] = useState(0);
  const [exported, setExported] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const downloadLabel = ['Download', 'Preparing download', 'Downloaded'][step];
  return (
    <Panel title="Icon swap" description="One control changing state. The new icon always rises in; down-up after an input, up-up for forward progress; slash pairs draw instead of swapping.">
      <div className="flex flex-col gap-4">
        <DemoRow
          label="download → pending → done" hint="down-up content transition"
          control={<Button size="sm" onClick={() => setStep(s => (s + 1) % 3)}>Advance: {downloadLabel}</Button>}
          visual={<IconSwap from={step < 2 ? 'download' : 'pending'} to={step < 1 ? 'pending' : 'check'} swapped={step > 0} label={downloadLabel} size="md" />}
        />
        <DemoRow
          label="export pending → done" hint="up-up for forward progress"
          control={<Button size="sm" aria-pressed={exported} onClick={() => setExported(v => !v)}>{exported ? 'Reset' : 'Finish export'}</Button>}
          visual={<IconSwap from="pending" to="check" swapped={exported} direction="up-up" label={exported ? 'Exported' : 'Exporting'} size="md" />}
        />
        <DemoRow
          label="mute" hint="slash magic-replace"
          control={<Button size="sm" aria-pressed={muted} onClick={() => setMuted(v => !v)}>{muted ? 'Unmute' : 'Mute'}</Button>}
          visual={<IconSwap from="sound-on" to="sound-off" swapped={muted} slash label={muted ? 'Unmute' : 'Mute'} size="md" />}
        />
        <DemoRow
          label="show / hide" hint="slash magic-replace"
          control={<Button size="sm" aria-pressed={hidden} onClick={() => setHidden(v => !v)}>{hidden ? 'Show' : 'Hide'}</Button>}
          visual={<IconSwap from="show" to="hide" swapped={hidden} slash label={hidden ? 'Show password' : 'Hide password'} size="md" />}
        />
        <DemoRow
          label="copy → copied" hint="the accessible name follows the state"
          control={<Button size="sm" onClick={() => setCopied(v => !v)}>{copied ? 'Reset' : 'Copy'}</Button>}
          visual={<IconSwap from="copy" to="check" swapped={copied} label={copied ? 'Copied' : 'Copy'} size="md" />}
        />
      </div>
    </Panel>
  );
}
