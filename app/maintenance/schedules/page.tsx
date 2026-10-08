// app/maintenance/schedules/page.tsx — recurring work: what repeats, how often, who does it and when it is next due. Each schedule can be raised now,
// paused, edited or deleted. This was the Schedules tab of the old Maintenance page and is now its own module in the Maintenance category.
'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, IconButton, PageHeader } from '@/components/ui-system';
import { uploadStrandedSchedules } from '../api';
import { ScheduleForm } from '../ScheduleForm';
import { SchedulesView } from '../SchedulesView';
import type { MaintenanceSchedule } from '../types';
import { useSchedules, useWorkOrders } from '../useMaintenanceData';

function SchedulesContent() {
  const orders = useWorkOrders();
  const schedules = useSchedules();
  const [schedFor, setSchedFor] = useState<{ schedule: MaintenanceSchedule | null } | null>(null);

  // Schedules kept only in this browser by an older version are sent to the server once, then the list reloads.
  const rescued = useRef(false);
  useEffect(() => {
    if (rescued.current) return;
    rescued.current = true;
    uploadStrandedSchedules().then(n => { if (n > 0) { toast.success(`Moved ${n} ${n === 1 ? 'schedule' : 'schedules'} from this browser to the server.`); void schedules.refetch(); } }).catch(() => {});
  }, [schedules]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Schedules' }]}
        title="Maintenance schedules"
        description="Recurring work that raises a work order on each due date."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh schedules" variant="ghost" pending={schedules.loading && schedules.loaded} onClick={() => schedules.refetch()} />
            <Button variant="primary" icon="plus" disabled={!schedules.loaded} onClick={() => setSchedFor({ schedule: null })}>New schedule</Button>
          </>
        )}
      />
      <SchedulesView list={schedules} orders={orders.items} onEdit={s => setSchedFor({ schedule: s })} onNew={() => setSchedFor({ schedule: null })} onRaised={() => void orders.refetch()} />
      <ScheduleForm open={!!schedFor} schedule={schedFor?.schedule ?? null} onOpenChange={o => { if (!o) setSchedFor(null); }} onSaved={() => void schedules.refetch()} />
    </div>
  );
}

export default function SchedulesPage() {
  return <AppShell migrated><SchedulesContent /></AppShell>;
}
