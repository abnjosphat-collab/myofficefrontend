import { describe, expect, it } from 'vitest';
import { IMPORT_CONFIGS, pluralize, templateCsv } from './emaintImport';

describe('emaintImport templates', () => {
  it('the asset template carries the assumed eMaint headers in order', () => {
    expect(templateCsv(IMPORT_CONFIGS.assets)).toBe(
      'Asset ID,Asset Description,Asset Type,Manufacturer,Model,Serial Number,Location,Department,Status,Criticality,Commission Date,Supplier,Purchase Cost,Warranty Info,Notes\n');
  });

  it('the PM template carries the assumed eMaint headers in order', () => {
    expect(templateCsv(IMPORT_CONFIGS.schedules)).toBe(
      'PM ID,Asset ID,Asset Description,PM Description,Frequency,Next Due,Last Done,Assigned To,Department,Priority,Estimated Hours,Instructions,Active\n');
  });

  it('only the name, title and frequency columns are required', () => {
    expect(IMPORT_CONFIGS.assets.fields.filter(f => f.required).map(f => f.key)).toEqual(['name']);
    expect(IMPORT_CONFIGS.schedules.fields.filter(f => f.required).map(f => f.key)).toEqual(['title', 'frequency']);
  });

  it('counts read naturally', () => {
    expect(pluralize(1, IMPORT_CONFIGS.assets.unit)).toBe('1 asset');
    expect(pluralize(3, IMPORT_CONFIGS.assets.unit)).toBe('3 assets');
    expect(pluralize(1, IMPORT_CONFIGS.schedules.unit)).toBe('1 PM schedule');
  });
});
