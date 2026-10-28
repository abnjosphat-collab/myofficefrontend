// app/dev/motion/page.tsx — the motion gallery (B3): every motion piece and
// every row of the effect matrix, side by side, with a simulated
// reduce-motion switch. Signed-in admin only, never in the nav.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import {
  Checkbox, EmptyState, LoadingPulse, MotionProvider, PageHeader,
} from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { roleAtLeast } from '@/lib/roles';
import { AnimatedIconSection, IconSwapSection, SpringsSection } from './icons';
import { DataRegionSection, NumberSection, PresenceSection } from './values';
import { IndicatorSection, MatrixSection, OverlaySection, PressSection } from './chrome';
import { ZoomSection } from './zoom';

export default function MotionGalleryPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const admin = !!profile && roleAtLeast(profile.role, 'admin');
  const [simulateReduce, setSimulateReduce] = useState(false);

  useEffect(() => {
    if (!loading && !admin) router.replace('/');
  }, [loading, admin, router]);

  // The simulated switch drives both halves: MotionConfig for framer pieces,
  // the data-mo-motion hook in tokens.css for CSS pieces. Always cleaned up.
  useEffect(() => {
    document.documentElement.dataset.moMotion = simulateReduce ? 'reduce' : '';
    return () => {
      document.documentElement.dataset.moMotion = '';
    };
  }, [simulateReduce]);

  return (
    <AppShell migrated>
      <PageHeader
        title="Motion gallery"
        description="Every motion piece and every row of the effect matrix. Admin-only development page; judge the feel here before the rollout."
      />
      {loading ? (
        <LoadingPulse label="Loading motion gallery" />
      ) : !admin ? (
        <EmptyState icon="lock" title="Admin access needed" description="You are being taken back to the home page." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-control border border-line bg-surface px-4 py-3">
            <Checkbox label="Simulate reduced motion" checked={simulateReduce} onChange={event => setSimulateReduce(event.target.checked)} />
            <p className="font-sans text-body-sm text-ink-muted">
              {simulateReduce
                ? 'Simulating: movement is a crossfade or instant, indefinite effects are still.'
                : 'Full motion. Flip the switch to judge the reduced-motion path of every piece.'}
            </p>
          </div>
          <MotionProvider motion={simulateReduce ? 'always' : 'user'}>
            <div className="flex flex-col gap-4">
              <SpringsSection />
              <AnimatedIconSection />
              <IconSwapSection />
              <NumberSection />
              <PresenceSection />
              <DataRegionSection />
              <IndicatorSection />
              <OverlaySection />
              <PressSection />
              <ZoomSection />
              <MatrixSection />
            </div>
          </MotionProvider>
        </div>
      )}
    </AppShell>
  );
}
