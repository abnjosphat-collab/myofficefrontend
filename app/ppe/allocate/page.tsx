// app/ppe/allocate/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassInput, GlassSelect, GlassTextarea, GlassButton,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

interface Employee { id: string; name: string; }
interface PpeItem { id: string; itemName: string; category: string; size: string; }

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good'      },
  { value: 'fair',      label: 'Fair'      },
  { value: 'worn',      label: 'Worn'      },
];

export default function CreateAllocationPage() {
  const sections = usePageCollapse({ hero: false, allocationDetails: false });
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ppeItems,  setPpeItems]  = useState<PpeItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employeeId:   '',
    ppeItemId:    '',
    serialNumber: '',
    issueDate:    new Date().toISOString().split('T')[0],
    expiryDate:   '',
    condition:    'good',
    notes:        '',
  });

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.ok ? r.json() : [])
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {});

    const stored = localStorage.getItem('ppe-items');
    if (stored) setPpeItems(JSON.parse(stored));
  }, []);

  const set = (field: keyof typeof formData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const employee = employees.find(emp => emp.id === formData.employeeId);
    const ppeItem  = ppeItems.find(item => item.id === formData.ppeItemId);

    const newAllocation = {
      ...formData,
      employeeName: employee?.name || 'Unknown',
      ppeItemName:  ppeItem?.itemName || 'Unknown',
      ppeCategory:  ppeItem?.category || 'unknown',
      size:         ppeItem?.size || 'Universal',
      status:       'active',
      issuedBy:     'current-user',
      id:           `alloc-${Date.now()}`,
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem('ppe-allocations') || '[]');
    localStorage.setItem('ppe-allocations', JSON.stringify([...existing, newAllocation]));
    router.push('/ppe');
  };

  const employeeOptions = employees.map(e => ({ value: e.id, label: e.name }));
  const ppeOptions      = ppeItems.map(i => ({ value: i.id, label: `${i.itemName} (${i.size})` }));

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4 max-w-2xl">

        <HeroPanel
          icon={Shield}
          title="Allocate Protective Equipment"
          subtitle="Assign PPE items to employees and track allocation details"
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <Link href="/ppe">
                <GlassButton variant="ghost" icon={ArrowLeft} size="sm">
                  Back to PPE
                </GlassButton>
              </Link>
            </>
          }
        />

        <GlassPanel icon={Shield} title="Allocation Details" variant="dark" {...sections.panel('allocationDetails')}>
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassSelect
                label="Employee"
                value={formData.employeeId}
                onChange={e => set('employeeId', e.target.value)}
                options={[{ value: '', label: 'Select employee…' }, ...employeeOptions]}
                required
              />

              <GlassSelect
                label="PPE Item"
                value={formData.ppeItemId}
                onChange={e => set('ppeItemId', e.target.value)}
                options={[{ value: '', label: 'Select PPE item…' }, ...ppeOptions]}
                required
              />

              <GlassInput
                label="Serial Number"
                value={formData.serialNumber}
                onChange={e => set('serialNumber', e.target.value)}
                placeholder="Enter serial number"
                required
              />

              <GlassSelect
                label="Condition"
                value={formData.condition}
                onChange={e => set('condition', e.target.value)}
                options={CONDITION_OPTIONS}
              />

              <GlassInput
                label="Issue Date"
                type="date"
                value={formData.issueDate}
                onChange={e => set('issueDate', e.target.value)}
                style={{ colorScheme: 'dark' }}
                required
              />

              <GlassInput
                label="Expiry Date"
                type="date"
                value={formData.expiryDate}
                onChange={e => set('expiryDate', e.target.value)}
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>

            <GlassTextarea
              label="Notes"
              value={formData.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes about this allocation…"
              rows={3}
            />

            <div className="flex gap-3 pt-2">
              <Link href="/ppe" className="flex-1">
                <GlassButton variant="ghost" className="w-full">Cancel</GlassButton>
              </Link>
              <GlassButton
                type="submit"
                variant="primary"
                icon={Save}
                loading={saving}
                className="flex-1"
              >
                Create Allocation
              </GlassButton>
            </div>
          </form>
        </GlassPanel>

      </main>
    </PageShell>
  );
}
