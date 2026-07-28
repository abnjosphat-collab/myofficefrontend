// app/condition-monitoring/types.ts — the condition-monitoring reading's data
// model. Split out of page.tsx as part of the standing "decompose on touch"
// convention.

export type CMResult = 'normal' | 'caution' | 'critical';
export type CMType = 'Oil Analysis' | 'Vibration' | 'Thermography';

export interface CMReading {
  id: number; equipment: string; component: string; type: CMType;
  date: string; value: string; unit: string; result: CMResult; technician: string; notes: string;
}

export interface CMReadingAPI {
  id: number; equipment_name?: string; component?: string; monitoring_type?: string;
  sampled_date?: string; value?: number | string; unit?: string; result?: string; technician?: string; notes?: string;
}
