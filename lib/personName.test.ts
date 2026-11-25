import { describe, expect, it } from 'vitest';
import { normalizeNamePart, normalizePersonName } from './personName';

describe('normalizePersonName', () => {
  it('title-cases uniform and inverted-case words', () => {
    expect(normalizePersonName('mercy')).toBe('Mercy');
    expect(normalizePersonName('MERCY')).toBe('Mercy');
    expect(normalizePersonName('mERCY')).toBe('Mercy');
    expect(normalizePersonName('mercy mazarire')).toBe('Mercy Mazarire');
    expect(normalizePersonName('MERCY MAZARIURE')).toBe('Mercy Mazariure');
    expect(normalizePersonName('mERCY mazarire')).toBe('Mercy Mazarire');
  });
  it('keeps interior capitals on genuinely mixed-case words', () => {
    expect(normalizePersonName('McDonald')).toBe('McDonald');
    expect(normalizePersonName("o'brien")).toBe("O'Brien");
    expect(normalizePersonName("O'BRIEN")).toBe("O'Brien");
    expect(normalizePersonName('UserE9801')).toBe('UserE9801');
  });
  it('collapses whitespace and handles hyphens', () => {
    expect(normalizePersonName('  mercy   mazarire  ')).toBe('Mercy Mazarire');
    expect(normalizePersonName('anna-marie')).toBe('Anna-Marie');
    expect(normalizePersonName('')).toBe('');
    expect(normalizePersonName(null)).toBe('');
  });
});

describe('normalizeNamePart', () => {
  it('handles single words', () => {
    expect(normalizeNamePart('mercy')).toBe('Mercy');
    expect(normalizeNamePart('MERCY')).toBe('Mercy');
    expect(normalizeNamePart('McDonald')).toBe('McDonald');
    expect(normalizeNamePart('')).toBe('');
  });
});
