import { describe, expect, it } from 'vitest';
import { blockingConditions, isEligibleForTool, needsAttention, toolConditions } from './toolConditions';
import type { Employee, Tool } from './prototype';

const tool = (over: Partial<Tool> = {}): Tool => ({
  id: 'T-001', name: 'Cordless drill', make: '', serial: '', category: 'Power tools', kind: 'cordless-drill',
  status: 'available', location: 'Main workshop', condition: 'Good', ...over,
});
const employee = (over: Partial<Employee> = {}): Employee => ({
  id: 'e1', backendId: 'b1', employeeNumber: 'E-001', name: 'A. Moyo', department: 'Engineering', active: true, ...over,
});

describe('toolConditions', () => {
  it('a ready tool with no lists shows met rows and information only', () => {
    const rows = toolConditions(tool());
    expect(rows.find(r => r.key === 'availability')).toMatchObject({ state: 'met' });
    expect(rows.find(r => r.key === 'inspections')).toMatchObject({ state: 'met' });
    expect(rows.find(r => r.key === 'competency')).toMatchObject({ state: 'info' });
    expect(blockingConditions(rows)).toEqual([]);
  });
  it('names the holder and blocks issuing a tool that is out', () => {
    const rows = toolConditions(tool({ status: 'issued', holder: 'B. Moyo · E-002' }));
    expect(rows.find(r => r.key === 'availability')).toMatchObject({ state: 'unmet', blocker: true });
    expect(blockingConditions(rows).map(r => r.key)).toContain('availability');
  });
  it('blocks archived tools and tools needing attention', () => {
    expect(blockingConditions(toolConditions(tool({ archived: true }))).map(r => r.key)).toContain('availability');
    expect(blockingConditions(toolConditions(tool({ status: 'attention' })))).toMatchObject([{ key: 'availability' }]);
  });
  it('checks the employee against the competency list', () => {
    const list = [{ id: 'b1', employeeNumber: 'E-001', name: 'A. Moyo', department: 'Engineering' }];
    expect(toolConditions(tool({ eligibleEmployees: list }), employee()).find(r => r.key === 'competency')).toMatchObject({ state: 'met' });
    const stranger = toolConditions(tool({ eligibleEmployees: list }), employee({ backendId: 'b9', employeeNumber: 'E-009', name: 'Z. Zed' }));
    expect(stranger.find(r => r.key === 'competency')).toMatchObject({ state: 'unmet', blocker: true });
    expect(toolConditions(tool({ eligibleEmployees: list })).find(r => r.key === 'competency')).toMatchObject({ state: 'info', blocker: false });
  });
  it('shares one eligibility predicate with the issue forms', () => {
    const list = [{ id: 'b1', employeeNumber: 'E-001', name: 'A. Moyo', department: 'Engineering' }];
    expect(isEligibleForTool(tool(), employee())).toBe(true);
    expect(isEligibleForTool(tool({ eligibleEmployees: list }), employee())).toBe(true);
    expect(isEligibleForTool(tool({ eligibleEmployees: list }), employee({ backendId: 'other', employeeNumber: 'E-001', name: 'Same number' }))).toBe(true);
    expect(isEligibleForTool(tool({ eligibleEmployees: list }), employee({ backendId: 'b9', employeeNumber: 'E-009', name: 'Z. Zed' }))).toBe(false);
    expect(isEligibleForTool(tool({ eligibleEmployees: [] }), employee())).toBe(false);
  });
  it('flags overdue inspections and clears them with the override', () => {
    const rows = toolConditions(tool({ inspectionDue: ['monthly', 'quarterly'] }));
    expect(rows.find(r => r.key === 'inspections')).toMatchObject({ state: 'unmet', blocker: true });
    expect(blockingConditions(rows).map(r => r.key)).toContain('inspections');
    expect(blockingConditions(rows, true).map(r => r.key)).not.toContain('inspections');
  });
  it('states the pre-use check as information — it is recorded after issue, never a blocker', () => {
    expect(toolConditions(tool({ preUseCheckRequired: true })).find(r => r.key === 'pre-use')).toMatchObject({ state: 'info', blocker: false, label: 'Pre-use inspection follows issue' });
    expect(toolConditions(tool()).find(r => r.key === 'pre-use')).toBeUndefined();
    expect(blockingConditions(toolConditions(tool({ preUseCheckRequired: true })))).toEqual([]);
  });
  it('needs no training for simple items, whatever the list says', () => {
    const rows = toolConditions(tool({ competencyRequired: false, eligibleEmployees: [] }), employee({ backendId: 'b9', employeeNumber: 'E-009', name: 'Z. Zed' }));
    expect(rows.find(r => r.key === 'competency')).toMatchObject({ state: 'info', blocker: false, label: 'No training needed for this item' });
    expect(isEligibleForTool(tool({ competencyRequired: false, eligibleEmployees: [] }), employee())).toBe(true);
  });
  it('blocks a not-working tool exactly like the backend register does', () => {
    expect(needsAttention(tool({ workingStatus: 'not_working' }))).toBe(true);
    expect(needsAttention(tool({ condition: 'Defective' }))).toBe(true);
    expect(needsAttention(tool({ condition: 'Damaged' }))).toBe(true);
    expect(needsAttention(tool({ condition: 'Missing' }))).toBe(true);
    expect(needsAttention(tool())).toBe(false);
    expect(needsAttention(tool({ workingStatus: 'working' }))).toBe(false);
    const rows = toolConditions(tool({ workingStatus: 'not_working' }));
    expect(rows.find(r => r.key === 'availability')).toMatchObject({ state: 'unmet', blocker: true });
    expect(blockingConditions(rows).map(r => r.key)).toContain('availability');
  });
  it('offers the resolving action on every actionable blocker row', () => {
    expect(toolConditions(tool({ status: 'issued', holder: 'B. Moyo · E-002' })).find(r => r.key === 'availability')?.actions).toEqual(['receive', 'transfer']);
    expect(toolConditions(tool({ status: 'attention' })).find(r => r.key === 'availability')?.actions).toEqual(['record-repair']);
    expect(toolConditions(tool({ workingStatus: 'not_working' })).find(r => r.key === 'availability')?.actions).toEqual(['record-repair']);
    expect(toolConditions(tool({ inspectionDue: ['monthly'] })).find(r => r.key === 'inspections')?.actions).toEqual(['record-check']);
    expect(toolConditions(tool()).find(r => r.key === 'availability')?.actions).toBeUndefined();
  });
  it('surfaces calibration, PPE, tracking and criticality as information, never blockers', () => {
    const rows = toolConditions(tool({ calibrationRequired: true, calibrationFrequencyDays: 90, requiredPpe: ['Goggles', 'Gloves'], cctvRequired: true, criticality: 'safety_critical' }));
    expect(rows.find(r => r.key === 'calibration')).toMatchObject({ state: 'info', blocker: false });
    expect(rows.find(r => r.key === 'ppe')).toMatchObject({ label: 'PPE: Goggles, Gloves' });
    expect(rows.find(r => r.key === 'cctv')).toMatchObject({ state: 'info' });
    expect(rows.find(r => r.key === 'criticality')).toMatchObject({ state: 'attention', blocker: false });
    expect(blockingConditions(rows)).toEqual([]);
  });
  it('matches a numberless person by id only, never by another missing number', () => {
    const list = [{ id: 'b1', employeeNumber: 'E-001', name: 'A. Moyo', department: 'Engineering' }];
    expect(isEligibleForTool(tool({ eligibleEmployees: list }), employee({ employeeNumber: null }))).toBe(true);
    expect(isEligibleForTool(tool({ eligibleEmployees: list }), employee({ backendId: 'b9', employeeNumber: null, name: 'Z. Zed' }))).toBe(false);
    const nullList = [{ id: 'b2', employeeNumber: null, name: 'N. One', department: 'Engineering' }];
    expect(isEligibleForTool(tool({ eligibleEmployees: nullList }), employee({ backendId: 'b9', employeeNumber: null, name: 'Z. Zed' }))).toBe(false);
    expect(toolConditions(tool({ eligibleEmployees: nullList }), employee({ backendId: 'b9', employeeNumber: null, name: 'Z. Zed' })).find(r => r.key === 'competency')).toMatchObject({ state: 'unmet', blocker: true });
  });
});
