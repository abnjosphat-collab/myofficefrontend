import { describe, expect, it } from 'vitest';
import { applyMovement, equipmentTypesForCategory, inferEquipmentKind, matchesTool, primaryToolImage, PEOPLE, LOCATIONS, type Movement } from './prototype';
import { TEST_TOOLS as SEED_TOOLS } from './testFixtures';

const input: Movement = { kind: 'issue', toolId: SEED_TOOLS[0].id, person: PEOPLE[0], location: LOCATIONS[1], due: '25 Sep, 16:00', job: '', condition: 'Good', notes: '' };

describe('Tools preview handovers', () => {
  it('records custody without mutating the source fixture', () => {
    const issued = applyMovement(SEED_TOOLS[0], input);
    expect(issued).toMatchObject({ status: 'issued', holder: PEOPLE[0], location: LOCATIONS[1], due: input.due });
    expect(SEED_TOOLS[0].status).toBe('available');
  });
  it.each([1, 3, 4])('prevents issuing an unavailable tool (%s)', index => {
    expect(() => applyMovement(SEED_TOOLS[index], input)).toThrow('not available');
  });
  it('holds defective returns and clears the previous loan', () => {
    const returned = applyMovement(SEED_TOOLS[1], { ...input, kind: 'return', condition: 'Damaged', notes: 'Broken guard' });
    expect(returned).toMatchObject({ status: 'attention', condition: 'Damaged', notes: 'Broken guard' });
    expect(returned.holder).toBeUndefined();
    expect(returned.due).toBeUndefined();
    expect(returned.job).toBeUndefined();
  });
  it('makes a good return available', () => {
    expect(applyMovement(SEED_TOOLS[1], { ...input, kind: 'return' }).status).toBe('available');
  });
  it('preserves the deadline and overdue state when custody transfers', () => {
    const transferred = applyMovement(SEED_TOOLS[3], { ...input, kind: 'transfer' });
    expect(transferred).toMatchObject({ status: 'overdue', due: SEED_TOOLS[3].due, holder: PEOPLE[0] });
  });
  it('extends an overdue loan while keeping its custodian', () => {
    expect(applyMovement(SEED_TOOLS[3], { ...input, kind: 'extend' })).toMatchObject({ status: 'issued', due: input.due, holder: SEED_TOOLS[3].holder });
  });
  it('does not create a return for a tool without a loan', () => {
    expect(() => applyMovement(SEED_TOOLS[0], { ...input, kind: 'return' })).toThrow('no open loan');
  });
  it('finds tools by partial name, ID, serial and holder', () => {
    for (const query of [' GRINDER ', 'eng-ag', 'demo-mk5030', 'alex']) expect(matchesTool(SEED_TOOLS[1], query)).toBe(true);
    expect(matchesTool(SEED_TOOLS[1], 'missing-tool')).toBe(false);
  });
  it('keeps materially different sample equipment on distinct visual types', () => {
    expect(new Set(SEED_TOOLS.map(tool => tool.kind)).size).toBe(SEED_TOOLS.length);
    for (const tool of SEED_TOOLS) expect(equipmentTypesForCategory(tool.category).map(type => type.value)).toContain(tool.kind);
  });
  it.each([
    ['MIG welder package', 'Welding', 'inverter-welder'],
    ['Hilti core drill', 'Power', 'rotary-hammer'],
    ['Hydraulic torque wrench set', 'Hand', 'torque-wrench'],
  ])('infers a recognizable icon for imported %s records', (name, category, expected) => {
    expect(inferEquipmentKind(name, category, 'other-equipment')).toBe(expected);
  });
  it('uses the first uploaded image as the register photograph and ignores PDFs', () => {
    const tool = { ...SEED_TOOLS[0], evidence: [
      { id: 'pdf', name: 'inspection.pdf', type: 'application/pdf', size: 400, url: 'blob:pdf' },
      { id: 'photo', name: 'drill.webp', type: 'image/webp', size: 800, url: 'blob:photo' },
    ] };
    expect(primaryToolImage(tool)).toBe('blob:photo');
    expect(primaryToolImage(SEED_TOOLS[0])).toBeUndefined();
  });
});
