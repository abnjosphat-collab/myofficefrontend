// components/ui-system/patterns/nameMatch.test.ts — how a typed name finds people and what completes after the caret.
import { describe, expect, it } from 'vitest';
import { inlineCompletion, lastListPart, nameScore, rankNames, type NameSuggestion } from './nameMatch';

const ann: NameSuggestion = { value: '1', label: 'Ann Alpha', keywords: ['C001'] };
const zed: NameSuggestion = { value: '2', label: 'Zed Zulu', keywords: ['C-009'] };
const anna: NameSuggestion = { value: '3', label: 'Anna Banda', keywords: ['C017'] };
const all = [zed, anna, ann];

describe('nameScore', () => {
  it('ranks a name that starts with the text above a surname, a mine number and a mere substring', () => {
    expect(nameScore(ann, 'ann al')).toBe(0);
    expect(nameScore(ann, 'alpha')).toBe(1);
    expect(nameScore(ann, 'alp an')).toBe(1);
    expect(nameScore(zed, 'c009')).toBe(2);
    expect(nameScore(ann, 'lph')).toBe(3);
    expect(nameScore(ann, 'xyz')).toBeNull();
    expect(nameScore(ann, '   ')).toBeNull();
  });

  it('does not let one typed word count twice', () => {
    expect(nameScore({ value: 'x', label: 'Ann Banda' }, 'ann ann')).toBeNull();
    expect(nameScore({ value: 'x', label: 'Ann Andrews' }, 'an an')).toBe(1);
  });
});

describe('rankNames', () => {
  it('puts start-of-name matches first, then alphabetical', () => {
    expect(rankNames(all, 'ann').map(s => s.label)).toEqual(['Ann Alpha', 'Anna Banda']);
    expect(rankNames(all, 'b').map(s => s.label)).toEqual(['Anna Banda']);
  });

  it('lifts recent people among equal matches, and shows only them when nothing is typed', () => {
    expect(rankNames(all, 'ann', ['3']).map(s => s.label)).toEqual(['Anna Banda', 'Ann Alpha']);
    expect(rankNames(all, '', ['2', '1']).map(s => s.label)).toEqual(['Zed Zulu', 'Ann Alpha']);
    expect(rankNames(all, '')).toEqual([]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ value: String(i), label: `Tom ${i}` }));
    expect(rankNames(many, 'tom')).toHaveLength(8);
  });
});

describe('inlineCompletion', () => {
  it('writes on the rest of the name in its own case', () => {
    expect(inlineCompletion('Ann Alpha', 'ann a')).toBe('lpha');
    expect(inlineCompletion('Ann Alpha', 'alpha')).toBe('');
    expect(inlineCompletion('Ann Alpha', 'Ann Alpha')).toBe('');
    expect(inlineCompletion('Ann Alpha', '')).toBe('');
  });
});

describe('lastListPart', () => {
  it('splits a comma list at the name being typed', () => {
    expect(lastListPart('Ann Alpha, Ze')).toEqual({ head: 'Ann Alpha, ', part: 'Ze' });
    expect(lastListPart('Ze')).toEqual({ head: '', part: 'Ze' });
    expect(lastListPart('Ann Alpha,')).toEqual({ head: 'Ann Alpha,', part: '' });
  });
});
