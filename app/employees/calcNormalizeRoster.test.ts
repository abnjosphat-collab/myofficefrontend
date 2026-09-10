import { describe, it, expect } from 'vitest';
import { planRosterNormalization, normalizedEmployeeFields } from './calcNormalizeRoster';
import type { Employee } from './types';

const base: Employee = {
  id: 1,
  employee_id: 'C1001',
  first_name: 'John',
  last_name: 'Doe',
  id_number: 'ID1',
  date_of_engagement: '2020-01-01',
  designation: 'Fitter Class 1',
  section: 'Mechanical',
};

describe('normalizedEmployeeFields', () => {
  it('normalizes designation, legacy section, and multi-phone formatting', () => {
    const fields = normalizedEmployeeFields({
      ...base,
      designation: 'Class 1 Electrician',
      section: 'Mechanical',
      phone: '0771234567;0712345678',
    });
    expect(fields.designation).toBe('Electrician Class 1');
    expect(fields.section).toBe('Electrical');
    expect(fields.phone).toBe('+263 77 123 4567 / +263 71 234 5678');
  });

  it('remaps Class 4 Driver designation to Light Vehicle Driver', () => {
    const fields = normalizedEmployeeFields({
      ...base,
      designation: 'Class 4 Driver',
    });
    expect(fields.designation).toBe('Light Vehicle Driver');
  });

  it('does not change drivers_license_class notes on tradespeople', () => {
    const fields = normalizedEmployeeFields({
      ...base,
      designation: 'Fitter Class 1',
      drivers_license_class: 'Class 4',
    });
    expect(fields.designation).toBe('Fitter Class 1');
  });
});

describe('planRosterNormalization', () => {
  it('lists only employees that would change', () => {
    const plan = planRosterNormalization([
      base,
      { ...base, id: 2, employee_id: 'C1002', first_name: 'Jane', designation: 'electrician', section: 'Electrical' },
      { ...base, id: 3, employee_id: 'C1003', first_name: 'Bob', designation: 'Rigger Class 1', section: 'Mechanical', phone: '+263 77 111 1111' },
    ]);
    expect(plan.total).toBe(3);
    expect(plan.affected).toBe(1);
    expect(plan.unchanged).toBe(2);
    expect(plan.items[0].name).toBe('Jane Doe');
    expect(plan.items[0].changes.some(c => c.field === 'designation')).toBe(true);
    expect(plan.byField.designation).toBe(1);
  });

  it('aligns legacy section names to the trade-implied section', () => {
    const plan = planRosterNormalization([
      { ...base, section: 'Instrumentation' },
    ]);
    expect(plan.affected).toBe(1);
    expect(plan.items[0].changes).toEqual([{ field: 'section', from: 'Instrumentation', to: 'Mechanical' }]);
  });

  it('returns empty plan when roster is already clean', () => {
    const plan = planRosterNormalization([base]);
    expect(plan.affected).toBe(0);
    expect(plan.items).toEqual([]);
  });

  it('plans designation fixes for Givemore Zaronga and Manias Mutova', () => {
    const plan = planRosterNormalization([
      {
        ...base,
        id: 10,
        employee_id: 'PM528',
        first_name: 'Givemore',
        last_name: 'Zaronga',
        designation: 'Mechanical Winder Technician',
        section: 'Mechanical',
      },
      {
        ...base,
        id: 11,
        employee_id: 'C0929',
        first_name: 'Manias',
        last_name: 'Mutova',
        designation: 'Hoist Technician Assistant',
        section: 'Mechanical',
      },
    ]);
    expect(plan.affected).toBe(2);
    const givemore = plan.items.find(i => i.employee_id === 'PM528');
    const manias = plan.items.find(i => i.employee_id === 'C0929');
    expect(givemore?.changes).toContainEqual({
      field: 'designation',
      from: 'Mechanical Winder Technician',
      to: 'Winder Technician Mechanical',
    });
    expect(manias?.changes).toContainEqual({
      field: 'designation',
      from: 'Hoist Technician Assistant',
      to: 'Fitter Class 2',
    });
  });

  it('remaps driver designations only — not licence notes on other trades', () => {
    const plan = planRosterNormalization([
      { ...base, id: 20, designation: 'Class 4 Driver' },
      { ...base, id: 21, designation: 'Fitter Class 1', drivers_license_class: 'Class 4' },
      { ...base, id: 22, first_name: 'Philip', last_name: 'Antonio', designation: 'Class 4 Driver' },
    ]);
    const driverRole = plan.items.find(i => i.id === 20);
    const fitterWithLicence = plan.items.find(i => i.id === 21);
    const philip = plan.items.find(i => i.id === 22);
    expect(driverRole?.changes).toContainEqual({
      field: 'designation',
      from: 'Class 4 Driver',
      to: 'Light Vehicle Driver',
    });
    expect(fitterWithLicence).toBeUndefined();
    expect(philip?.changes).toContainEqual({
      field: 'designation',
      from: 'Class 4 Driver',
      to: 'Light Vehicle Driver',
    });
  });

  it('archives Hoist Driver roles and fixes Stores Driver designation', () => {
    const plan = planRosterNormalization([
      {
        ...base,
        id: 40,
        designation: 'Hoist Driver',
      },
      {
        ...base,
        id: 41,
        employee_id: 'PP288',
        first_name: 'Philip',
        last_name: 'Antonio',
        designation: 'Stores Driver',
      },
      {
        ...base,
        id: 42,
        employee_id: 'PM320',
        first_name: 'Malven ',
        last_name: 'Midzi',
        designation: 'Hoist Technician',
      },
    ]);
    expect(plan.items.find(i => i.id === 40)?.changes).toContainEqual({
      field: 'archived',
      from: 'No',
      to: 'Yes',
    });
    expect(plan.items.find(i => i.id === 41)?.changes).toContainEqual({
      field: 'designation',
      from: 'Stores Driver',
      to: 'Light Vehicle Driver',
    });
    expect(plan.items.find(i => i.id === 42)?.changes).toContainEqual({
      field: 'designation',
      from: 'Hoist Technician',
      to: 'Winder Technician Electrical',
    });
    expect(plan.items.find(i => i.id === 42)?.changes.some(c => c.field === 'archived')).toBe(false);
  });

  it('fixes Sibanengi Bafana Driver designation', () => {
    const plan = planRosterNormalization([
      {
        ...base,
        id: 50,
        employee_id: 'C1342',
        first_name: 'Sibanengi',
        last_name: 'Bafana',
        designation: 'Driver',
      },
    ]);
    expect(plan.items[0].changes).toContainEqual({
      field: 'designation',
      from: 'Driver',
      to: 'Light Vehicle Driver',
    });
  });

  it('fixes Maxwell Chitumbi boilermaker designation', () => {
    const plan = planRosterNormalization([
      {
        ...base,
        id: 60,
        employee_id: 'C0322',
        first_name: 'Maxwell ',
        last_name: 'Chitumbi',
        designation: 'Boilermaker',
        section: 'Mechanical',
      },
    ]);
    expect(plan.items[0].changes).toContainEqual({
      field: 'designation',
      from: 'Boilermaker',
      to: 'Boilermaker Semi Skilled',
    });
  });
});
