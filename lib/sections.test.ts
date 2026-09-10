import { describe, it, expect } from 'vitest';
import { normalizeSection, sectionColor, SECTION_ORDER, SECTION_COLORS } from './sections';

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

describe('sectionColor', () => {
  it('returns the predefined color for each known section', () => {
    SECTION_ORDER.forEach(s => expect(sectionColor(s)).toBe(SECTION_COLORS[s]));
  });
  it('returns a fixed gray for Unassigned', () => {
    expect(sectionColor()).toBe('#94a3b8');
    expect(sectionColor('')).toBe('#94a3b8');
  });
  it('is stable (same input -> same color) for a section outside the predefined set', () => {
    expect(sectionColor('Logistics')).toBe(sectionColor('Logistics'));
  });
  it('normalizes before coloring, so case variants of a known section match', () => {
    expect(sectionColor('electrical')).toBe(SECTION_COLORS.Electrical);
    expect(sectionColor('civil')).toBe(SECTION_COLORS.Planning);
  });
});
