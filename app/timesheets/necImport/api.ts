import { api } from '@/lib/apiClient';
import type { NecImportConfig, NecImportJob, NecImportPreview } from './types';

const BASE = '/api/nec-timesheet-import';

export async function fetchImportConfig(): Promise<NecImportConfig> {
  return api.get<NecImportConfig>(`${BASE}/config`);
}

export async function createImportJob(payrollYear: number, payrollMonth: number): Promise<NecImportJob> {
  return api.post<NecImportJob>(`${BASE}/jobs`, { payroll_year: payrollYear, payroll_month: payrollMonth });
}

export async function listImportJobs(): Promise<{ jobs: NecImportJob[] }> {
  return api.get(`${BASE}/jobs`);
}

export async function getImportJob(jobId: string): Promise<NecImportJob> {
  return api.get(`${BASE}/jobs/${jobId}`);
}

export async function uploadPdf(jobId: string, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/jobs/${jobId}/documents`, fd);
}

export async function uploadReviewJson(jobId: string, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/jobs/${jobId}/review-json`, fd);
}

export async function runExtract(jobId: string): Promise<unknown> {
  return api.post(`${BASE}/jobs/${jobId}/extract`);
}

export async function fetchPreview(jobId: string): Promise<{ job: NecImportJob; preview: NecImportPreview }> {
  return api.get(`${BASE}/jobs/${jobId}/preview`);
}

export async function applyImport(jobId: string, dryRun: boolean): Promise<{ stats: Record<string, number>; dry_run: boolean }> {
  return api.post(`${BASE}/jobs/${jobId}/apply?dry_run=${dryRun ? 'true' : 'false'}`);
}
