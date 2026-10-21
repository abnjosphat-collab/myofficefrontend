import { describe, expect, it } from 'vitest';
import { matchSpare, searchSpares } from './spareSearch';

const bearing = { stock_code: 'BRG-1', description: 'Bearing 6204', category: 'Bearings', unit_price: 12.5, current_quantity: 3 };
const seal = { stock_code: 'SEAL-9', description: 'Seal kit', categories: ['Seals', 'Hydraulics'], supplier: 'Bearing World', unit_price: 30, current_quantity: 0 };
const belt = { stock_code: 'BLT-2', description: 'V-belt', notes: 'for the winder motor', machine_type: 'Winder', storage_location: 'Bin A3', unit_price: 8, current_quantity: 12 };

describe('matchSpare', () => {
  it('matches the code, description and single category, case-insensitively', () => {
    expect(matchSpare(bearing, 'brg')).toBe(true);
    expect(matchSpare(bearing, '6204')).toBe(true);
    expect(matchSpare(bearing, 'bearings')).toBe(true);
    expect(matchSpare(bearing, 'SEAL')).toBe(false);
  });

  it('matches every category in the list, plus supplier, notes, machine and location', () => {
    expect(matchSpare(seal, 'hydraulics')).toBe(true);
    expect(matchSpare(seal, 'bearing world')).toBe(true);
    expect(matchSpare(belt, 'winder')).toBe(true);
    expect(matchSpare(belt, 'bin a3')).toBe(true);
    expect(matchSpare(belt, 'gearbox')).toBe(false);
  });

  it('an empty query matches everything', () => {
    expect(matchSpare(bearing, '')).toBe(true);
    expect(matchSpare(bearing, '   ')).toBe(true);
  });
});

describe('searchSpares', () => {
  it('returns the matches with the uncapped total, capped at 40', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ ...bearing, stock_code: `BRG-${i}` }));
    const { hits, total } = searchSpares(many, 'brg');
    expect(hits).toHaveLength(40);
    expect(total).toBe(50);
    expect(searchSpares([bearing, seal, belt], 'seal').hits).toHaveLength(1);
    expect(searchSpares([bearing, seal, belt], '').total).toBe(3);
  });
});
