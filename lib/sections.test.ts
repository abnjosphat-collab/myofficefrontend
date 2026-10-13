import { describe, it, expect } from 'vitest';
import { normalizeSection } from './sections';

describe('normalizeSection', () => {
  it('canonicalizes case/whitespace variants to the predefined section name', () => {
    expect(normalizeSection('management')).toBe('Management');
    expect(normalizeSection('electrical')).toBe('Electrical');
    expect(normalizeSection('  Mechanical ')).toBe('Mechanical');
    expect(normalizeSection('planning')).toBe('Planning');
  });
  it('maps legacy Civil and Instrumentation to current sections', () => {
    expect(normalizeSection('Civil')).toBe('Planning');
    expect(normalizeSection('INSTRUMENTATION')).toBe('Electrical');
  });
  it('returns "Unassigned" for empty/missing input', () => {
    expect(normalizeSection()).toBe('Unassigned');
    expect(normalizeSection('')).toBe('Unassigned');
    expect(normalizeSection('   ')).toBe('Unassigned');
  });
  it('passes through a section name outside the predefined ones unchanged', () => {
    expect(normalizeSection('Logistics')).toBe('Logistics');
  });
});

