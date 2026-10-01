# Navigation redesign plan — header, sidebar, homepage

Status: implemented and verified 2026-10-01 (see
`VERIFICATION_2026-10-01.md` § Navigation redesign). This plan is kept
as the design record.

Requested: icon-only header actions, abbreviated department dropdown, shorter
wordmark, hairline header (no box), feedback FAB, narrower search, spotlight +
MRU pill sidebar with collapsible icons, Homepage tab replacing At a glance,
popup consistency, spanner settings icon.

## Principles

- Same tonal system, same inside-only hover language, same focus halos.
- No behavior removed without a replacement path (overview shortcuts move to
  Homepage cards; feedback modal stays for the inbox Add flow).
- Stored preferences migrate silently (unknown sections dropped, never crash).
- Verifier updated only where the intended UX changed (landing tab); all
  behavioral pins stay.

## 1. Header

- Wordmark text → "Equipment E-System"; keeps Jakarta semibold + tool icon tile.
- Header chrome: Feedback (icon+label), Settings (icon+label), account
  (icon+name+role) → icon-only buttons with tooltips (ActionHint) and full
  aria-labels. Notifications bell already icon-only.
- Department control: label + borderless trigger showing abbreviations
  (All departments→ALL, Engineering→ENG, Mining→MIN, Mine Technical
  Services→MTS, IT→IT; unknown names fall back to word-initial acronym;
  full name in `title` + menu). Soft static mineral glow, no outline.
  AnimatedSelect gains optional `shortLabels` (trigger-only) — menu keeps
  full names; existing callers unaffected.
- Header container: no box; hairline top + bottom, content breathes between.
- Search: max ~430px on desktop (a bit over a third), full-width on mobile
  as today; stays global on every tab including Homepage.

## 2. Feedback FAB

- Floating circular action bottom-right (chat icon), expands an anchored
  panel embedding the existing ToolsFeedback form (text + audio + send).
  Escape/close collapses; focus returns to the FAB. Reduced-motion safe.
- Header Feedback button removed. Feedback modal kind kept (inbox Add path).

## 3. Sidebar

- Brand row replaced by spotlight slot: current section's icon + label,
  plus the existing collapse toggle. No site icon/text.
- Remaining tabs in a vertical pill container, ordered by recency
  (most-recently-used first; never-used keep default order). Current tab
  appears only in the spotlight, never duplicated in the list.
- Recency + icons-open persist in `myoffice.tools.sidebar.v1`
  ({recent: ToolsTab[], iconsOpen: boolean}); unknown/corrupt values ignored.
- Icons toggle: small chevron on the pill collapses the list (spotlight
  stays). Independent from whole-sidebar collapse.
- Pill top-aligns with the header block; radius collapses gracefully when
  the sidebar is collapsed (icon-only) and flattens to a row on mobile.
- Pure helper `rankTabs(tabs, current, recent)` in toolSelectors + unit test.

## 4. Homepage tab (replaces At a glance)

- New first tab `homepage` (House icon), becomes the landing tab.
- Content from already-loaded data, no new endpoints:
  - Shortcut stat cards (Equipment, Ready to use, With employees, Past
    return date, Employees, Open incidents, Pending gate passes,
    Checks due) — each navigates like the old overview shortcuts.
  - "Needs attention" list (overdue, open incidents, due checks, pending
    approvals) with empty state.
  - "Recent movements" (latest 6 history events) with empty state.
- Source-state honesty: cards/lists whose source failed show "Unavailable"
  + retry instead of zeroes; loading shows the established loader copy.
- Overview removal: delete ToolsOverview.tsx; drop `overview` from
  SectionName; remove layout reorder UI (single section left) + Restore
  button; drop `overviewOpen` from stored prefs (old values ignored).
  `blocks`/order machinery renders the register directly.
- Results header, toolbar extras and export stay hidden on Homepage
  (global search remains). Homepage added to command-palette pages.

## 5. Icons

- `settings: GearSix` → `Wrench` (only used by the Settings button).
- Add `home: House` (Homepage tab), `chat: ChatCircleText` (FAB).

## 6. Popups

- New FAB panel matches dialog language (paper, hairline, 12px, halo-less
  hover). Audit pass over notification panel, action/filter menus, select
  panels, help hints: align outliers to paper + hairline + inside-only
  hover; focus halos untouched.

## 7. Department abbreviations

- `abbreviateDepartment(name)` next to DEPARTMENTS in prototype.ts:
  exact map + fallback (single word → first 3 letters upper; multi-word →
  initials skipping and/of/for). Unit tests in prototype.test.ts.

## 8. Test + verifier updates (intended-behavior changes only)

- toolsPreferences.test: single-section defaults; unknown sections dropped.
- New: rankTabs tests, abbreviateDepartment tests, ToolsHomepage render
  test, AnimatedSelect shortLabels test.
- verify.mjs: after each reload, navigate to Equipment before asserting
  register content (landing is now Homepage); tab clicks by name unaffected
  by MRU/spotlight (names unique). All behavioral pins unchanged.

## 9. Risks

- MRU reorder must never duplicate/drop tabs (rankTabs total-function test).
- Spotlight + list must keep exactly one instance per tab (screenshot check).
- Homepage must never show failure-zeroes (per-source states + review).
- Mobile rail: pill/spotlight flatten without overflow (390px check).
- Old prefs with `overview` in order/hidden: parser drops them (tested).

## Implementation order

Icons+abbreviations → AnimatedSelect → header → FAB → sidebar →
homepage → overview removal → popups → tests → build → verifier →
screenshots → docs.
