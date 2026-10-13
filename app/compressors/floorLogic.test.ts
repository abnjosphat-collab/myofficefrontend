import { describe, expect, it } from 'vitest';
import { serviceLife, statusAccent } from './floorLogic';

describe('serviceLife', () => {
  it('measures the way from the last interval passed to the next one', () => {
    const life = serviceLife(1500); // between the 1000 h and 2000 h services
    expect(life.next).toBe(2000);
    expect(life.fraction).toBeCloseTo(0.5);
    expect(life.hoursLeft).toBe(500);
  });

  it('starts from zero before the first service', () => {
    expect(serviceLife(250).fraction).toBeCloseTo(250 / 400); // first service is the 400 h one
  });

  it('turns red and urgent within a week of the service', () => {
    const life = serviceLife(1960); // 40 h left, 5 days at 8 h a day
    expect(life.urgent).toBe(true);
    expect(life.tone).toBe('var(--mo-danger)');
  });

  it('says so when every planned interval has passed', () => {
    expect(serviceLife(17000)).toMatchObject({ next: null, fraction: 1, urgent: false });
  });
});

describe('statusAccent', () => {
  it('gives each status its own colour and an unknown one a neutral', () => {
    expect(statusAccent('running')).toBe('var(--mo-success)');
    expect(statusAccent('maintenance')).toBe('var(--mo-warning)');
    expect(statusAccent('mystery')).toBe('var(--mo-neutral)');
  });
});
