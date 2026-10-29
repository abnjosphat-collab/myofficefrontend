// Unit tests for scripts/motion-consistency.mjs (the docs:check ratchet):
// each rule flags a violation, stays quiet on allowed shapes, and honours
// the exception lists. The script itself runs over the whole tree in
// docs:check; these pin its judgement rule by rule.
import { describe, expect, it } from 'vitest';
import { scanText } from '../../../scripts/motion-consistency.mjs';

const rules = (rel: string, text: string) => scanText(rel, text).map(f => f.rule);

describe('motion-consistency', () => {
  it('flags framer imports outside motion/', () => {
    expect(rules('app/leaves/page.tsx', `import { motion } from 'framer-motion';`)).toContain('framer-import');
    expect(rules('components/ui-system/motion/X.tsx', `import { motion } from 'framer-motion';`)).not.toContain('framer-import');
  });

  it('honours the framer exception list (compressors + floor migrated in B4s4)', () => {
    for (const rel of [
      'components/ui-system/patterns/LoadingPulse.tsx',
      'components/home/useTypewriterPlaceholder.ts',
      'app/test-homepage/page.tsx',
    ]) {
      expect(rules(rel, `import { motion } from 'framer-motion';`), rel).not.toContain('framer-import');
    }
  });

  it('flags logic waiting on animation-complete', () => {
    expect(rules('app/leaves/page.tsx', `<motion.div onAnimationComplete={close} />`)).toContain('animation-complete');
    expect(rules('components/ui-system/motion/X.tsx', `// onAnimationComplete is banned even here in prose`)).not.toContain('animation-complete');
  });

  it('flags layout/layoutId except on named movers', () => {
    const withImport = (jsx: string) => `import { motion } from 'framer-motion';\n${jsx}`;
    expect(rules('app/leaves/page.tsx', withImport(`<motion.div layoutId="x" />`))).toContain('layout-scope');
    expect(rules('app/leaves/page.tsx', withImport(`<motion.div layout />`))).toContain('layout-scope');
    expect(rules('app/compressors/page.tsx', withImport(`<motion.span layoutId="view-pill" />`))).toContain('layout-scope');
    // Recharts layout="vertical" is not framer.
    expect(rules('app/issues/Panel.tsx', `<BarChart layout="vertical" />`)).not.toContain('layout-scope');
    // Prose and comments never flag.
    expect(rules('app/x.tsx', `// one layout at a time\nconst layout = useColumnLayout();`)).not.toContain('layout-scope');
  });

  it('flags raw transition params except in motion/ and the migration list', () => {
    expect(rules('app/leaves/page.tsx', `<motion.div transition={{ duration: 0.3 }} />`)).toContain('raw-transition');
    expect(rules('app/leaves/page.tsx', `<motion.div transition={{ type: 'spring', stiffness: 300 }} />`)).toContain('raw-transition');
    expect(rules('components/ui-system/motion/X.tsx', `<motion.div transition={{ duration: 0.3 }} />`)).not.toContain('raw-transition');
    expect(rules('app/compressors/page.tsx', `<motion.div transition={{ duration: 0.3 }} />`)).toContain('raw-transition');
    expect(rules('components/ui-system/patterns/LoadingPulse.tsx', `<motion.div transition={{ duration: 0.3 }} />`)).not.toContain('raw-transition');
    expect(rules('app/leaves/page.tsx', `<motion.div transition={SPRING.smooth} />`)).not.toContain('raw-transition');
  });

  it('flags literal duration-[<n>ms] classes', () => {
    expect(rules('app/leaves/page.tsx', `className="duration-[220ms]"`)).toContain('literal-ms');
    expect(rules('app/leaves/page.tsx', `className="duration-[var(--mo-duration-base)]"`)).not.toContain('literal-ms');
  });

  it('flags linear easing outside motion/', () => {
    expect(rules('app/leaves/page.tsx', `transition={{ ease: 'linear' }}`)).toContain('linear-ease');
    expect(rules('components/ui-system/motion/presets.ts', `ease: 'linear'`)).not.toContain('linear-ease');
  });

  it('flags inline ease arrays except in the study', () => {
    expect(rules('app/leaves/page.tsx', `<motion.div transition={{ ease: [0.16, 1, 0.3, 1] }} />`)).toContain('raw-ease');
    expect(rules('app/test-homepage/page.tsx', `<motion.div transition={{ ease: [0.16, 1, 0.3, 1] }} />`)).not.toContain('raw-ease');
    expect(rules('components/ui-system/motion/X.tsx', `ease: [0.16, 1, 0.3, 1]`)).not.toContain('raw-ease');
  });

  it('flags raw cubic-bezier except tokens + the fan spin-up', () => {
    expect(rules('app/leaves/x.css', `.x { transition-timing-function: cubic-bezier(.2, .8, .2, 1); }`)).toContain('raw-bezier');
    expect(rules('components/ui-system/foundations/tokens.css', `--mo-ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);`)).not.toContain('raw-bezier');
    expect(rules('components/shared/floor/floor.module.css', `.fan { animation-timing-function: cubic-bezier(.2, .8, .2, 1); }`)).not.toContain('raw-bezier');
  });

  it('flags @keyframes except the allow-listed loops and markers', () => {
    expect(rules('app/leaves/x.css', `@keyframes slideUp { from { opacity: 0; } }`)).toContain('raw-keyframes');
    expect(rules('components/shared/floor/floor.module.css', `@keyframes spinUp { 0% { transform: rotate(0); } }`)).not.toContain('raw-keyframes');
    expect(rules('app/globals.css', `@keyframes mo-caret-blink { 50% { opacity: 0; } }`)).not.toContain('raw-keyframes');
    expect(rules('app/login-preview/login-preview.module.css', `@keyframes drift { from { transform: none; } }`)).not.toContain('raw-keyframes');
  });

  it('flags animate-bounce and animate-ping with no exceptions', () => {
    expect(rules('app/leaves/page.tsx', `<span className="animate-bounce" />`)).toContain('banned-animate');
    expect(rules('app/leaves/page.tsx', `<span className="animate-ping" />`)).toContain('banned-animate');
    expect(rules('app/leaves/page.tsx', `<span className="animate-pulse" />`)).not.toContain('banned-animate');
  });
});
