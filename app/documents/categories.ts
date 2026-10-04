// app/documents/categories.ts — the seven ISO 55001 clauses the hub is organised by, and the built-in folders under each.
import type { IconMeaning } from '@/components/ui-system';

export interface Category { id: string; name: string; icon: IconMeaning; description: string; folders: string[] }

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Organizational Context', icon: 'building', description: 'Internal and external issues, stakeholder requirements, AMS scope',
    folders: ['Internal & External Issues', 'Stakeholder Requirements', 'AMS Scope & Boundaries', 'Asset Hierarchy & Data Governance'] },
  { id: '2', name: 'Leadership', icon: 'employees', description: 'Organizational structure, asset policy, RACI matrix',
    folders: ['Organizational Structure & Roles', 'Asset Management Policy', 'Responsibilities & Authorities (RACI)'] },
  { id: '3', name: 'Planning', icon: 'target', description: 'Risk management, objectives, asset management plans, budgeting',
    folders: ['Risk Management', 'AM Objectives & KPIs', 'Asset Management Plans (AMP)', 'Budget, Forecast & Demand Planning', 'Change Management'] },
  { id: '4', name: 'Support', icon: 'training', description: 'Resources, training, communication, documentation',
    folders: ['Resource Management', 'Competence & Training', 'Awareness & Communication', 'Documented Information'] },
  { id: '5', name: 'Operation', icon: 'settings', description: 'Operational planning, change management, procurement',
    folders: ['Operational Planning & Control', 'Management of Change', 'Outsourcing & Procurement'] },
  { id: '6', name: 'Performance Evaluation', icon: 'analytics', description: 'Monitoring, audits, management review',
    folders: ['Monitoring & Measurement', 'Internal Audit', 'Management Review'] },
  { id: '7', name: 'Improvement', icon: 'zap', description: 'Corrective actions, continual improvement',
    folders: ['Nonconformity & Corrective Action', 'Continual Improvement'] },
];

export const categoryById = (id: string) => CATEGORIES.find(c => c.id === id);
export const categoryByName = (name: string) => CATEGORIES.find(c => c.name === name);
