// app/ppe/allocate/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Save } from '@/components/shared/theme';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero, FormField, FormActions, SelectField } from '@/components/shared/theme';

interface Employee { id: string; name: string; }
interface PpeItem { id: string; itemName: string; category: string; size: string; }

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'worn', label: 'Worn' },
];

function CreateAllocationContent() {
  const t = useTheme();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ppeItems, setPpeItems] = useState<PpeItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '', ppeItemId: '', serialNumber: '',
    issueDate: new Date().toISOString().split('T')[0], expiryDate: '', condition: 'good', notes: '',
  });

  useEffect(() => {
    fetch('/api/employees').then(r => r.ok ? r.json() : []).then((data: Employee[]) => setEmployees(data)).catch(() => {});
    const stored = localStorage.getItem('ppe-items');
    if (stored) setPpeItems(JSON.parse(stored));
  }, []);

  const set = (field: keyof typeof formData, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const employee = employees.find(emp => emp.id === formData.employeeId);
    const ppeItem = ppeItems.find(item => item.id === formData.ppeItemId);

    const newAllocation = {
      ...formData,
      employeeName: employee?.name || 'Unknown',
      ppeItemName: ppeItem?.itemName || 'Unknown',
      ppeCategory: ppeItem?.category || 'unknown',
      size: ppeItem?.size || 'Universal',
      status: 'active', issuedBy: 'current-user',
      id: `alloc-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem('ppe-allocations') || '[]');
    localStorage.setItem('ppe-allocations', JSON.stringify([...existing, newAllocation]));
    router.push('/ppe');
  };

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Shield}
        accent="violet"
        crumbs={['Safety & Compliance', 'PPE', 'Allocate']}
        title="Allocate Protective Equipment"
        description="Assign PPE items to employees and track allocation details"
        actions={
          <Link href="/ppe" className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${t.chipBg} ${t.hoverBg} ${t.textMuted}`}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to PPE
          </Link>
        }
      />

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}>
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span className={`font-semibold text-sm ${t.textPrimary}`}>Allocation Details</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Employee" required>
                <SelectField size="form" value={formData.employeeId} title="Employee" onChange={v => set('employeeId', v)}
                  placeholder="Select employee…" options={employees.map(emp => ({ value: emp.id, label: emp.name }))} />
              </FormField>
              <FormField label="PPE Item" required>
                <SelectField size="form" value={formData.ppeItemId} title="PPE item" onChange={v => set('ppeItemId', v)}
                  placeholder="Select PPE item…" options={ppeItems.map(i => ({ value: i.id, label: `${i.itemName} (${i.size})` }))} />
              </FormField>
              <FormField label="Serial Number" required>
                <input value={formData.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="Enter serial number" className={inputCls} required />
              </FormField>
              <FormField label="Condition">
                <SelectField size="form" value={formData.condition} title="Condition" onChange={v => set('condition', v)}
                  options={CONDITION_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
              </FormField>
              <FormField label="Issue Date" required>
                <input type="date" value={formData.issueDate} title="Issue date" onChange={e => set('issueDate', e.target.value)} className={inputCls} required />
              </FormField>
              <FormField label="Expiry Date" required>
                <input type="date" value={formData.expiryDate} title="Expiry date" onChange={e => set('expiryDate', e.target.value)} className={inputCls} required />
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this allocation…" rows={3}
                className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
            </FormField>
          </div>
          <FormActions onCancel={() => router.push('/ppe')} submitting={saving} submitLabel="Create Allocation" accent="emerald" />
        </form>
      </div>
    </main>
  );
}

export default function CreateAllocationPage() {
  return <AppShell><CreateAllocationContent /></AppShell>;
}
