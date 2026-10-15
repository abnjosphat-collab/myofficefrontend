# Handoff to Muse, 10 October 2026: polish, sweep, even out

You are taking over a long run of work on the MyOffice ERP (Next.js 16, React 19, Tailwind v4 frontend in `frontend/`;
FastAPI + Supabase backend in `backend/`). The owner's direction, in their words: *keep polishing, sweeping, cleaning,
perfecting and evening out; make behaviour and looks consistent; make the UI as quiet as possible; let people do what they
want in as few steps as possible; adjust spacing, colour harmony and typeface pairing; and find the other areas like these
yourself. Do all of it by reusing and improving shared components, not by patching pages one at a time.*

Read this whole file, then `docs/CURRENT_HANDOFF.md`, `components/ui-system/README.md` and `docs/MIGRATION_LEDGER.md`.

## Where things stand (all uncommitted, nothing pushed)

The owner said "dont push yet". Both repos hold a large uncommitted working tree. Some of it is not yours (see
"Boundaries"). Do not commit, push, deploy, run a migration or change live data unless the owner says so for that batch.

Done this week, all verified only against fixture data:

1. **One look for the whole app.** The compressors floor design is now app-wide: `components/shared/floor/`
   (`FloorProvider` mounted once in `components/Providers.tsx`, `FloorBackdrop`, `floor-themes.css` with the single Sage theme,
   `floor.module.css`, `motion.tsx`, `signals.ts`, `fonts.ts`). The theme is set on `<html data-floor-theme>`, so every shared
   card, table, dialog and menu follows it through tokens. A one-line CSS rule makes `.bg-canvas` page wrappers transparent so
   the backdrop shows (the clean fix is in `ui-system/shell/Frame.tsx`, which another session owns; ask first).
2. **/compressors** is the new floor (old page deleted). Week/month views, unit side panel, Excel/PDF downloads, services read
   from the Equipment register. **/compressors/preview is gone.**
3. **/tools fully rebuilt** on the shared system: `useToolsWorkspace.ts` (all state and actions, no JSX), `ToolsFrame`,
   `ToolsSections`, `ToolsSectionBar`, `RegisterView`, `ToolDrawer`, `ToolsModals`, forms, People, Compliance, Analytics, Auth,
   Source registers, Feedback, Import, Export, Customize. `tools.module.css` (139 KB), its icon set, custom dropdowns and date
   input are deleted. Route spec: `scripts/route-specs/tools.mjs`.
4. **Shared pieces added:** `AppearanceFields` (typeface, text size, hints; used by both Settings dialogs), `DataTable`
   `rowSelectLabel` / `rowSelectBlocked`, `lib/notificationSound.ts` (sound chosen in the top-bar Settings), `toolFromServer.ts`.
5. **Verification at the end:** `tsc` clean, `eslint` 0 errors, `vitest` 1227/1227, route specs for `/tools`, `/compressors`, `/`
   and others pass, and axe (WCAG 2.1 AA) found 0 violations on all 47 spec routes and on `/login`.

## What is left (in priority order)

**A. Confirm the new look page by page (do this first).** Only home, equipment, compressors and Tools were looked at with eyes.
The other ~45 routes passed axe but nobody has *looked* at them with the floor behind them. Render every route
(`scripts/route-specs/*.mjs` give you fixture data; a sweep script is easy: `fixtureContext` + `makeHandler` from
`scripts/lib/fixtures.mjs`, screenshot at 1440 and 390), read the pictures, and fix what is off at the shared level first:
hard-coded colours that ignore the tokens, chart palettes, tables or panels with their own opaque backgrounds, pages with
their own gutters, anything that looks pasted on. Look at the 8 routes the ledger marks "legacy body" separately.

**B. Visual-regression baselines will now be stale.** The repo has a visual-regression gate (Playwright, baselines generated
with the `signInFixture` placeholder-URL fallback). The look changed everywhere, so regenerate the baselines on purpose,
inspect each, and do not accept a baseline you have not looked at. Also re-run `npm run test:a11y`.

**C. Quiet the UI (the owner's main taste).** Read `myoffice-ui-taste` in memory first. Rules that are settled: flat cards (6 to
10 px corners, hairline, almost no shadow), colour as small detail not surface, no tilt or lift on hover, animation only on
appear, hover or a real event (never looping), filters in dropdowns not chip rows, short headers (page name only, no eyebrow or
preview line), collapsible secondary panels, no on-page paragraphs where a tooltip or the empty state will do. The measured
header noise from the earlier audit (breadcrumb repeating the title, description paragraph, 3 to 4 header buttons, 4 to 6
tiles, tabs, toolbar) should be reduced in `PageHeader` / `Toolbar` / `Tabs` once, not per page. Re-measure with grep before
and after (count header buttons per page, pages with more than one primary action, text counts inside tab labels).

**D. Fewer steps.** Walk the five most common jobs end to end and count clicks: record a compressor reading, issue and return a
tool, approve leave/overtime (bulk exists), add a work order, record a timesheet cell. Remove steps: defaults, remembered last
choices, inline editing, one confirmation instead of two, keyboard paths, "Today" and "last used" shortcuts. Prefer a shared
behaviour (a `useRememberedChoice`, a default in `FormDialog`) over a page fix.

**E. Consistency of behaviour.** One status vocabulary and tone map (`lib/status.ts`; the audit found about 65 disagreeing local
maps and "In progress" shown as info in one module and warning in another), one date format (`lib/format.ts`; there are still
direct `toLocale*` calls, lint warns on them), one currency formatter, one empty/loading/error pattern (`DataRegion`,
`LoadingPulse`), one removable-chip pattern (`Tag onRemove`), icon-only buttons with the shared tooltip, the same toolbar order
(header, figures, tabs, toolbar), "Refresh" as a ghost icon everywhere or nowhere.

**F. Typeface pairing, spacing, colour harmony.** The floor sets `--mo-font-display` (Space Grotesk) and a mono face for meters,
over Inter/Manrope/Jakarta body text. Decide, with measurement, where the display face belongs (page titles and figures) and
where it must not appear (table text, form labels). Audit spacing against the tokens: list the distinct gaps and paddings in use
(grep `gap-`, `p-`, `space-`), collapse strays onto the scale, and check the rhythm between header, figure row, toolbar and
content is identical on every page. Check the Sage palette against every status colour pair (success, warning, danger, info)
and every chart series on the sage canvas; fix at the token, never per page.

**G. Things I know are rough or changed (verify, then decide):**
- Tools lost the equipment pictograms and the card quick Issue/Receive button (open the side panel instead). If the owner misses
  them, a shared card action is the answer, not a Tools-only widget.
- Tools free-text fields use the browser's native suggestion list (no Tab-to-complete). Consider one shared `Combobox` that allows
  free text if it feels worse in use.
- The Tools sidebar reorders itself by recent use (`rankTabs`), so items move under the pointer. Probably should be stable.
- Analytics "Explore" dialogs were dropped; the "workspace layout" setting was dropped (it had one item).
- The 3D backdrop is `position: fixed` on every page: check scroll performance on a low-end phone, and `prefers-reduced-motion`.
- Sound/ripple signals are wired only on compressors and Tools. Decide whether saves elsewhere should signal (owner liked it, but
  asked for no looping motion).
- Pages that still render their own `bg-*` wrappers or fixed hex colours (`no-hex-colour` lint exists for `app/`, not everywhere).

**H. Backlog that needs the owner (do not start without their word):**
- Maintenance hour-based services: design is in `docs/MAINTENANCE_HOUR_BASED_SERVICES.md` (milestones 1000/2000/4000/8000/16000;
  work order raised a day before; Engineering department; separate mechanical and electrical work orders; overdue raises
  priority). Waiting for "build it". The compressors Services tab already shows service state read-only.
- NEC October scan import: review JSON is built, not applied; the owner's decisions (blank days, inferred OFF rows, 15 Sep
  holiday cells, wrong-period page, a few conflicts) are listed in memory `myoffice-nec-october-2026-import`.
- 22 unmatched leave/overtime/PPE records for the owner to resolve; database gaps from the audit that are still open (training
  held in memory on the server, inventory in browser storage, timesheet roster exceptions in browser storage). Check
  `docs/CURRENT_HANDOFF.md` for which are closed.
- Backend: the compressors-register work, the history endpoint fix and the retired CSV import are uncommitted; the
  `compressors.equipment_id` migration was already run by the owner. Dependency CVEs (`pip-audit`) need an owner call.
- Commit and push when the owner says so: group by topic, stage explicit paths, run `git status --short` afterwards.

## Boundaries (important)

- **Do not commit, push, deploy, migrate or change live data without explicit authorisation for that batch.** A previous attempt
  to write to Supabase through the tool was declined by the permission layer; do not route around a denial.
- **Other session's files:** `app/timesheets/Nec(Person|Quick)View*`, `components/shared/timesheet/TotalsStrip*`,
  `scripts/route-specs/timesheets.mjs`, shifts, standby, artisan-timesheets, test-homepage, `ShellSidebar.tsx`,
  `ui-system/shell/Frame.tsx`. Read them; do not edit them without asking. Their lint warnings are theirs.
- Never click "Sign in" on a form autofilled with the owner's login; do not attach to or drive the owner's browser tab; keep
  throwaway scripts in the scratchpad, not in `frontend/` (a stray `.js` file there can crash the whole Tailwind build).
- No credentials or private records in docs or fixtures. Leave backend dependencies alone unless authorised.

## How to work

- **Measure, don't guess.** Grep and count before and after; render and look at screenshots (desktop 1440, phone 390). Say what
  you measured. Done means it ran: `npx tsc --noEmit`, `npx eslint .` (0 errors; do not add warnings), `npx vitest run`,
  `MSYS_NO_PATHCONV=1 node scripts/verify-routes.mjs --only <routes>`, `npm run docs:ledger` then `npm run docs:check`, and axe
  on what you changed. Backend: `.venv/Scripts/python.exe -m pytest` with a short `--basetemp`.
- **Reuse before inventing.** When several call sites share a byte-identical pattern, that is the shared component asking to
  exist. Fix it in `components/ui-system` (or `components/shared`), delete the copies, and let the pages shrink.
- **Right-sized.** Say what you chose not to build and why. This is a boundary on process, never on craft: inside the domains the
  app covers, go deep.
- **Windows quirks:** many files are CRLF (normalise in scripts, or use the Edit tool); long heredocs with quotes break the Bash
  tool, so write scripts to files; pytest needs a short `--basetemp`; `taskkill` on uvicorn can leave an orphan worker.
- **Ask when a decision is the owner's** (a look they might not want, removing a feature, anything in section H). Otherwise
  decide, do it, and report what changed in plain words.
- Keep memory current: update `myoffice-ui-taste` when the owner reacts to a visual change, and note decisions and bugs in the
  project memory index. Keep this file's section list honest: delete what you finish.
