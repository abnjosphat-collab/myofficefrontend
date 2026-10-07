// app/test-homepage/verdict.ts — the one-line operations verdict for the TestHomepage
// concept. Pure logic over real figures + alert counts, so the honesty rules are
// unit-tested, not eyeballed: never an all-clear on partial data, never a zero
// standing in for an unknown, never a claim the sources can't back.
export interface VerdictInput {
  openBreakdowns: number | null;
  activeWorkOrders: number | null;
  criticalCount: number;
  pendingCount: number;
  /** The most severe actionable item's destination, when its module resolves to one. */
  topItem: { href: string; module: string } | null;
  /** Resolved catalogue links for the stat-driven branches (null when unresolvable). */
  breakdownsHref: string | null;
  workOrdersHref: string | null;
  /** Any backing source failed to load. */
  failed: boolean;
}

export type VerdictTone = 'clear' | 'attention' | 'critical' | 'unknown';

export interface Verdict {
  tone: VerdictTone;
  headline: string;
  detail: string | null;
  cta: { label: string; href: string } | null;
  /** Total failure: the only honest action is reloading, not navigating anywhere. */
  suggestReload: boolean;
}

const INCOMPLETE = 'Some records couldn\u2019t be loaded \u2014 what you see may be incomplete.';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function opsVerdict(input: VerdictInput): Verdict {
  const { openBreakdowns, activeWorkOrders, criticalCount, pendingCount, topItem, breakdownsHref, workOrdersHref, failed } = input;

  // Nothing usable at all: say so and offer the way out. No zeros, no links.
  if (failed && criticalCount === 0 && pendingCount === 0 && openBreakdowns === null && activeWorkOrders === null) {
    return {
      tone: 'unknown',
      headline: 'Some figures couldn\u2019t be loaded.',
      detail: INCOMPLETE,
      cta: null,
      suggestReload: true,
    };
  }

  if (criticalCount > 0) {
    return {
      tone: 'critical',
      headline: `${plural(criticalCount, 'critical item needs', 'critical items need')} a response.`,
      detail: failed ? INCOMPLETE : null,
      cta: topItem ? { label: `Open ${topItem.module}`, href: topItem.href } : null,
      suggestReload: false,
    };
  }

  if (pendingCount > 0) {
    return {
      tone: 'attention',
      headline: `${plural(pendingCount, 'item is', 'items are')} waiting on approval.`,
      detail: failed ? INCOMPLETE : null,
      cta: topItem ? { label: `Open ${topItem.module}`, href: topItem.href } : null,
      suggestReload: false,
    };
  }

  if (openBreakdowns !== null && openBreakdowns > 0) {
    return {
      tone: 'attention',
      headline: `${plural(openBreakdowns, 'open breakdown', 'open breakdowns')}.`,
      // criticalCount is 0 on this branch, so "none critical" is earned — unless a
      // failed source could be hiding one, in which case say that instead.
      detail: failed ? INCOMPLETE : 'None are marked critical.',
      cta: breakdownsHref ? { label: 'Open Breakdowns', href: breakdownsHref } : null,
      suggestReload: false,
    };
  }

  // No actionable items — but an all-clear needs complete knowledge. Unknown
  // breakdown/work-order figures (or any failed source) downgrade to "unknown".
  if (failed || openBreakdowns === null || activeWorkOrders === null) {
    return {
      tone: 'unknown',
      headline: 'No critical items in view.',
      detail: INCOMPLETE,
      cta: null,
      suggestReload: false,
    };
  }

  if (activeWorkOrders > 0) {
    return {
      tone: 'clear',
      headline: 'Everything is clear.',
      detail: openBreakdowns === 0
        ? `${plural(activeWorkOrders, 'active work order', 'active work orders')} in progress. No open breakdowns.`
        : `${plural(activeWorkOrders, 'active work order', 'active work orders')} in progress.`,
      cta: workOrdersHref ? { label: 'View work orders', href: workOrdersHref } : null,
      suggestReload: false,
    };
  }

  return {
    tone: 'clear',
    headline: 'Everything is clear.',
    detail: 'Nothing needs you right now.',
    cta: null,
    suggestReload: false,
  };
}
