/**
 * Role-based type hierarchy. Interface code picks a ROLE, never a raw size:
 * every role is scale-aware (85–130% appearance preference) and carries its
 * family, weight, tracking and colour so equal roles look identical across
 * modules and portals.
 *
 * Do not shrink text to fit a dense screen — reorganise the information.
 * The smallest role is `caption` (12px at 100%).
 */
export const type = {
  /** Rare: a single headline moment, e.g. a greeting on the homepage. */
  display: 'font-display text-display text-ink',
  /** One per page — the page <h1>. */
  pageTitle: 'font-display text-page text-ink',
  /** Section / panel / dialog headings. */
  sectionTitle: 'font-display text-section text-ink',
  /** Card and list-item titles, table record names. */
  title: 'font-sans text-title text-ink',
  /** Running text. */
  body: 'font-sans text-body text-ink',
  /** Supporting descriptions beneath a title or field. */
  supporting: 'font-sans text-body-sm text-ink-muted',
  /** Form labels, column headings, toolbar labels. */
  label: 'font-sans text-label text-ink',
  /** Metadata, timestamps, counts, helper text. */
  caption: 'font-sans text-caption text-ink-muted',
  /** Validation message under a field. */
  error: 'font-sans text-caption font-medium text-danger',
  /** KPI value. */
  metric: 'font-display text-metric text-ink tabular',
  /** Dense table cell text. */
  cell: 'font-sans text-body-sm text-ink',
  /** Numbers that must align in columns. */
  numeric: 'tabular',
} as const;

export type TypeRole = keyof typeof type;
