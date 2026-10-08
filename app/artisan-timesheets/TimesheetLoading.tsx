// app/artisan-timesheets/TimesheetLoading.tsx — the loading animation now lives in the shared UI system (LoadingPulse) so every
// page loads the same way; this name stays so the timesheet screens and their tests are unchanged.
export { LoadingPulse as TimesheetLoading } from '@/components/ui-system/patterns/LoadingPulse';
