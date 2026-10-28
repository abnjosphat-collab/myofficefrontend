// components/ui-system/patterns/BellBadge.tsx — the one badge rule for both bells
// (MyOffice shell, Tools): dark green normally, red only when something is overdue
// or critical. Both bells render this in the same corner of the bell button, so the
// badge never drifts between the two again. Each bell decides its own `urgent`
// from its own data; the rule "urgent means red" lives here alone. The count
// rolls digit by digit when it changes (in place under reduced motion).
import { CountBadge } from '../primitives/Badge';
import { NumberTransition } from '../motion';

/** Pure — the shared badge rule: dark green normally, red when urgent. */
export function bellBadgeTone(urgent: boolean): 'brand' | 'danger' {
  return urgent ? 'danger' : 'brand';
}

/** The bell count badge. The parent must be `relative`; large values cap at 9+. */
export function BellBadge({ value, urgent }: { value: number; urgent: boolean }) {
  return (
    <span className="pointer-events-none absolute -right-0.5 -top-0.5">
      <CountBadge value={<NumberTransition value={Math.min(value, 9)} suffix={value > 9 ? '+' : ''} />} tone={bellBadgeTone(urgent)} />
    </span>
  );
}
