// components/app-shell/index.ts — barrel export for the shared app chrome.
export { AppShell } from './AppShell';
export { useAppShellState } from './useAppShellState';
export { useAppShell } from './context';
export { useDashboardData } from './useDashboardData';
export type { DashboardStats, ActivityItem } from './useDashboardData';
export * from './modules';
