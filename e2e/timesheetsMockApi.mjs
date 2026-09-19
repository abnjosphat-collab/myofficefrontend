// Deterministic API stubs for /timesheets Playwright tests — no backend or auth.
import { mockApi } from './mockApi.mjs';

export const MOCK_NEC_EMPLOYEES = [
  {
    id: 101,
    employee_id: 'C0001',
    first_name: 'Alex',
    last_name: 'Artisan',
    employment_type: 'NEC',
    is_active: true,
    position: 'Electrician',
    department: 'Engineering',
    email: 'alex@example.test',
  },
  {
    id: 102,
    employee_id: 'C0002',
    first_name: 'Jordan',
    last_name: 'Verylongsurname ForTruncate',
    employment_type: 'NEC',
    is_active: true,
    position: 'Lamp Room Attendant',
    department: 'Operations',
    email: 'jordan@example.test',
  },
  {
    id: 103,
    employee_id: 'C0003',
    first_name: 'Sam',
    last_name: 'Supervisor',
    employment_type: 'NEC',
    is_active: true,
    position: 'Foreman',
    department: 'Engineering',
    email: 'sam@example.test',
  },
];

/** Route handler: populated roster + empty module merges unless timesheets URL matched. */
export function mockTimesheetsApi(route) {
  const url = route.request().url();
  if (url.includes('/api/employees')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_NEC_EMPLOYEES),
    });
  }
  if (url.includes('/api/timesheets')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  }
  if (url.includes('/api/leaves') || url.includes('/api/overtime') || url.includes('/api/standby')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  }
  return mockApi(route);
}
