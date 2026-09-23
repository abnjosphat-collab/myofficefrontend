const normalise = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function editDistance(left: string, right: string) {
  const a = normalise(left);
  const b = normalise(right);
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + cost);
      diagonal = above;
    }
  }
  return previous[b.length];
}

const synonymGroups = [
  ['tool', 'tools', 'equipment', 'asset', 'assets', 'machine'],
  ['employee', 'employees', 'person', 'people', 'personnel', 'staff', 'worker'],
  ['issue', 'issued', 'handover', 'hand over', 'loan', 'borrow'],
  ['return', 'receive', 'received', 'check in'],
  ['setting', 'settings', 'preference', 'preferences', 'customise', 'customize', 'appearance'],
  ['document', 'documents', 'attachment', 'attachments', 'file', 'files', 'pdf', 'photo', 'image'],
  ['download', 'export', 'report', 'reports'],
  ['upload', 'import', 'spreadsheet', 'excel', 'word', 'csv'],
  ['history', 'activity', 'audit', 'trail', 'movement'],
  ['dark', 'black', 'night'],
  ['light', 'white', 'day'],
];

const synonyms = new Map<string, string[]>();
for (const group of synonymGroups) {
  for (const word of group) synonyms.set(normalise(word), group.map(normalise));
}

export function fuzzyScore(query: string, searchableText: string) {
  const needle = normalise(query);
  const haystack = normalise(searchableText);
  if (!needle || !haystack) return 0;
  if (haystack === needle) return 220;
  if (haystack.startsWith(needle)) return 170;
  if (haystack.includes(needle)) return 130;

  const words = haystack.split(' ');
  const queryWords = needle.split(' ').flatMap(word => synonyms.get(word) ?? [word]);
  let score = 0;
  let matchedOriginalWords = 0;
  const originals = needle.split(' ');
  for (const original of originals) {
    const alternatives = synonyms.get(original) ?? [original];
    let best = 0;
    for (const candidate of alternatives) {
      for (const word of words) {
        if (word === candidate) best = Math.max(best, 48);
        else if (candidate.length >= 2 && word.startsWith(candidate)) best = Math.max(best, 38);
        else if (candidate.length >= 3 && word.includes(candidate)) best = Math.max(best, 28);
        else if (candidate.length >= 3) {
          const distance = editDistance(candidate, word);
          const allowance = Math.max(1, Math.floor(Math.max(candidate.length, word.length) * .34));
          if (distance <= allowance) best = Math.max(best, 27 - distance * 5);
        }
      }
    }
    if (best > 0) matchedOriginalWords += 1;
    score += best;
  }
  if (matchedOriginalWords === 0 || (originals.length > 1 && matchedOriginalWords !== originals.length)) return 0;
  if (matchedOriginalWords === originals.length) score += 28;
  if (queryWords.some(word => haystack.includes(word))) score += 12;
  return score;
}

export function fuzzyMatch(query: string, searchableText: string) {
  return !query.trim() || fuzzyScore(query, searchableText) > 0;
}
