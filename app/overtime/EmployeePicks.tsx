// app/overtime/EmployeePicks.tsx — the shared PeoplePicker, re-exported under its
// old name so existing imports stand. New code imports PeoplePicker from ui-system.
export { PeoplePicker as EmployeePicks, type PickedPerson } from '@/components/ui-system';
