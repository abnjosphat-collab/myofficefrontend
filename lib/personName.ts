// lib/personName.ts — person-name normalisation shared by the register form
// and the server parser.
//
// Uniform-case words are title-cased (mercy/MERCY -> Mercy), inverted-case
// words too (mERCY -> Mercy); genuinely mixed-case words keep their interior
// capitals (McDonald, UserE9801 stay as typed, first letter uppercased) so
// real names and register codes survive.

/** Normalise one whitespace/hyphen/apostrophe-separated part. */
export function normalizeNamePart(word: string): string {
  if (!word) return '';
  const hasLetter = /[a-zA-Z]/.test(word);
  const isUniform = hasLetter && (word === word.toUpperCase() || word === word.toLowerCase());
  if (isUniform) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  if (word.length > 1 && /[a-z]/.test(word[0]) && word.slice(1) === word.slice(1).toUpperCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return /[a-zA-Z]/.test(word[0] || '') ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** Canonical person name: trim, collapse whitespace, then normalise each part. */
export function normalizePersonName(raw?: string | null): string {
  const cleaned = (raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.replace(/[^\s\-']+/g, normalizeNamePart);
}
