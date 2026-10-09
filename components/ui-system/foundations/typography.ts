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
  pageTitle: 'font-display text-page font-medium tracking-tight text-ink',
  /** Panel, chart and dialog headings: the blocks a page is made of. */
  sectionTitle: 'font-display text-section font-semibold text-ink',
  /** A heading inside a section: an empty or error state, a group within a panel. */
  title: 'font-display text-title font-semibold text-ink',
  /** The name on a record card or list item. */
  recordTitle: 'font-display text-title font-medium leading-snug text-ink',
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
