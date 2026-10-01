# Header polish plan — dept placement, profile reveal, expandable search, alignment, icon fill

Status: implemented and verified 2026-10-01 (see
`VERIFICATION_2026-10-01.md` § Header polish). Kept as the design
record.

## Measurements (1440px, before; device px)

| Element | h | y | note |
|---|---|---|---|
| bell / settings / account | 34 | 25 | widths 34/39/38, radius 7 (effective) |
| dept trigger | 36 | 24 | 1px above the icons (centering) |
| search container | 42 | — | filter 42, viewToggle outer 41 (33+6+2) |
| spotlight / nav / iconsToggle | 40 | — | already aligned, no change |

Radii are effectively 7px everywhere in these rows (global override);
no radius change needed.

## Decisions

1. **Dept stays in the header, moves right.** Department is a global
   scope (every tab, counts, notifications); the toolbar would imply
   register-only scope. New order:
   `[wordmark] … [dept ▾] | [bell][spanner][account]`.
   The divider is the requested separation between control types.
   "Department" label removed; an `ActionHint` on the trigger keeps
   discoverability ("Department scope"). Trigger keeps its
   abbreviations; trigger width becomes content-sized.
2. **Profile reveal.** Signed-in account clicks open an anchored
   popover (notification-panel language: paper, hairline, restrained
   shadow) with initials avatar, name, username, Access + Department
   rows, the 7-day hint, and a full-width Sign out. Signed-out still
   opens the auth modal. Bus id `account`; opening closes
   filters/actions/notifications/feedback explicitly.
3. **Expandable search** (toolbar + homepage, same component).
   Collapsed: 42px icon button matching the toolbar row. Expands via
   max-width transition with input fade; `/` expands + focuses; Escape
   collapses when empty; blur collapses when empty and focus leaves;
   collapsed input is `tabindex -1` + `aria-hidden`. Results panel
   unchanged. Mobile: collapsed stays 42px (overrides the full-width
   rule); expanded takes the full row.
4. **Alignment fixes.** Header icons 34→36, square 36×36 (bell,
   settings, account); dept trigger stays 36. ViewToggle inner buttons
   33→34 (outer 41→42). Coarse-pointer: add settings/account to the
   44px min-width rule (bell already there). Re-measure after.
5. **Icon fill: keep neutral (declined).** Resting chrome must stay
   quiet so the Issue green (the one primary voice) and semantic
   colors (badge, pills) speak. Green-filled icons would add three
   competing green masses, flatten hierarchy, and repeat one treatment
   on every control. Balance already exists: brand-soft hover/active
   wash, dept glow, and the solid-green FAB echoing Issue.

## Implementation

- `app/page.tsx`: move dept block into `previewControls` with
  divider; account button toggles profile panel when signed in;
  profile open state + bus/dismissal effect; `/` shortcut expands
  search first.
- `ToolsProfilePanel.tsx` (new) + test: identity, rows, sign out,
  close; Escape/outside/bus dismissal covered by page effect or
  internal mirror of `ToolsNotifications`.
- `ToolsWorkspaceSearch.tsx` + test: `expanded` state, trigger
  button, collapse rules, `/` entry via `inputRef` contract change
  (page calls `expandSearchRef`? — simplest: keep `inputRef` on the
  always-mounted input and add an `expandRef` callback… decided in
  code: input stays mounted, page focuses it, component expands on
  focus).
- `tools.module.css`: header 36px layer, dept content width,
  divider, profile panel, expandable search, toggle 34px, coarse
  additions, mobile rules.
- `scripts/verify.mjs`: expand search before fill; assert header
  heights (36) + toolbar heights (42) + shared tops.
- Docs: verification log entry; this plan marked implemented.

## Verification

`vitest`, `tsc`, `eslint`, `next build`, `node scripts/verify.mjs`
(exit 0), re-measure probe (header 36/36, toolbar 42/42, tops equal),
screenshots: header desktop, dept open at right, profile open,
search collapsed/expanded, mobile 390 header + dept + profile.
