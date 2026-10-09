import { describe, expect, it } from 'vitest';
import { indexRegister, matchToRegister } from './registerMatch';

const register = indexRegister([
  { id: 7, employee_id: 'C1042', first_name: 'Tariro', last_name: 'Moyo' },
  { id: 8, employee_id: 'C2001', first_name: 'Anesu', last_name: 'Dube', archived: true } as never,
]);

describe('matchToRegister', () => {
  it('links a record whose mine number is on the register, ignoring case and spaces', () => {
    expect(matchToRegister({ employee_id: ' c1042 ', employee_name: 'Anyone' }, register)).toBe('linked');
  });
  it('treats an archived person as still on the register', () => {
    expect(matchToRegister({ employee_id: 'C2001', employee_name: 'Anesu Dube' }, register)).toBe('linked');
  });
  it('says the number differs when only the name matches', () => {
    expect(matchToRegister({ employee_id: 'C9999', employee_name: 'tariro  moyo' }, register)).toBe('number-differs');
  });
  it('says the number differs when the record holds the internal row id', () => {
    expect(matchToRegister({ employee_id: '7', employee_name: 'T. Moyo' }, register)).toBe('number-differs');
  });
  it('says not on register when neither the number nor the name matches', () => {
    expect(matchToRegister({ employee_id: 'X-1', employee_name: 'Nobody Here' }, register)).toBe('not-on-register');
    expect(matchToRegister({ employee_id: '', employee_name: '' }, register)).toBe('not-on-register');
  });
});
