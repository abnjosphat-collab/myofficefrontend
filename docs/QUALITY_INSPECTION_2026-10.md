# MyOffice quality inspection — October 2026

Shared-level inspection against Apple HIG topics, WCAG 2.2 AA, ISO/IEC 25010,
ISO 9241-110 and the repo's engineering rules. Every finding below names the
shared fix or the reason none was made. Severity: high (blocks the pass),
medium (fixed in this pass), low (noted), info (verified, no action).

Note on sources: the Apple HIG site renders client-side and could not be
fetched from this environment; HIG coverage follows the brief's enumerated
topic list. WCAG 2.2 was checked against the W3C Understanding docs (fetched)
plus axe on every route (2.1 AA tags — the installed axe-core's set).

## Fixed in this pass

| # | Finding | Principle | Evidence | Fix |
|---|---------|-----------|----------|-----|
| 1 | Sidebar spotlight: glyph square used the same 9px radius as the pill, corners looked clipped | HIG clarity; DRY (one nav component) | `components/ui-system/shell/Nav.tsx:83`, `tmp/phase1-shots/tools-overview-row@2x.png` | Square is now `rounded-sm` (5px = 9 − 4 inset); `Nav.test.tsx` pins the nesting |
| 2 | Segmented selected state (white fill + shadow) read as a text field | HIG clarity, consistency | `components/ui-system/primitives/Segmented.tsx:27`, Tools condition control | Selected is `bg-action-soft text-action`, no shadow — the same language ViewToggle and the radio cards already use; `Segmented.test.tsx` 2/2 |
| 3 | Five form Segmenteds had aria-only names, no visible label | WCAG 2.4.6/3.3.2; HIG writing | BulkIssueForm, ToolsForms, ToolDrawer, ToolsImport, QuotationPanels | Wrapped in shared `FieldGroup` (the RosterExportDialog precedent). Toolbar filter groups intentionally keep aria-only names |
| 4 | Floor canvas redrew a static frame at ~60fps on /tools (56 rAF/2s); old grid/horizon layer on other pages | ISO 25010 performance; HIG deference | `components/shared/deep-space/MeshCanvas.tsx`, rAF counts before/after | Loop runs only for the sign-in sweep (0 rAF on app pages incl. 390px and reduced-motion); quiet net on every page; old CSS layer deleted |
| 5 | `drawFloor` + floor-plane consts dead since both looks drew the stage net (one branch even iterated the wrong bound) | No dead code | `MeshCanvas.tsx` (was L18-24, L124-172) | Deleted (~60 lines); sign-in re-shot identical; eslint clean |
| 6 | Close-turn gesture hardcoded `250ms`, outside the 120/180/260 tokens | Consistency; HIG motion | `components/ui-system/foundations/gestures.ts:8` | Now `var(--mo-duration-slow)` (260ms) |
| 7 | LeaveForm + ArtisanEditor previews rendered "Not recorded" as plain data text | Consistency (one missing-data language) | `LeaveForm.tsx:85`, `ArtisanEditor.tsx:52` | Quiet italic span, matching `Fact` |
| 25 | Dialog footers with 3 actions wrapped mid-row at 390px (primary stranded on row 2) | HIG mobile layout; touch | shifts footer @390 before/after (`tmp/phase2-shots/footer-shifts-detail-*`) | Footer stacks full-width below sm, primary visually first (`max-sm:flex-col-reverse`); Tools skin shares the container so it stacks too; `Dialog.test.tsx` pins the classes |
| 26 | "monthly check overdue" rendered lowercase as a sentence-leading title in two places | HIG writing | Conditions panel + override notice (`tmp/phase1-shots/tools-issueform.png`) | One shared `overdueCheckLabel()` ("Monthly, quarterly check overdue"); unit + route-spec expectations updated |
| 27 | Required fields announced nothing to screen readers (`required` was visual-only) | WCAG 1.3.1/3.3.2 | `Field.tsx` context carried no required flag | `useFieldProps()` now returns `aria-required`; `Field.test.tsx` asserts present/absent |
| 28 | Charts animated on mount even under prefers-reduced-motion; 22x repeated a11y/sizing props | WCAG 2.3.3; DRY | 13 files, 22 `accessibilityLayer={false}` + `ResponsiveContainer` pairs, zero `isAnimationActive` | Shared `Chart` frame (`patterns/Chart.tsx`): responsive box, AT-hiding, still series under reduced motion; all 22 migrated (one keeps `minWidth`); `Chart.test.tsx` 4/4. Proved in-browser: line path interpolates over 6 frames in motion mode, 1 frame (snapped) reduced. Note: recharts v3 ignores the chart-level `isAnimationActive`, so the frame sets it on Bar/Line/Area by displayName |
| 29 | Spec `iso()` mixed local setDate with UTC serialization: day-offset assertions failed 00:00-02:00 local | Test reliability | engineering-dashboard "4 days ago" red at 01:06, green after fix at 01:30 in-window | Local-date serialization in 14 spec files + `today`/`ym`; standby's `local()` was the precedent |
| 30 | deep-space-preview spec counted page canvases === 1; app-wide floor adds a second | Test reliability | Rerun FAIL "the particle canvas renders" | Assertion now expects the preview canvas over the app-wide floor canvas (2), with comment |
| 31 | standby spec: non-exact 'Crew One' (strict violation vs intentional "+ Crew One" chip); exact 'Name' vs decorated "Name*" label | Test reliability | Both failed identically in the 10/14 baseline log | Exact text match; non-exact label match (unique substring, verified) |
| 41 | tasks-events comment model completed under owner delegation (5 tsc to 0, spec green) | Unblock the shared type gate + build | `dialogs.tsx` vs `types.ts`, spec contract, `LoadingPulse` API | Dead `in_progress` branch removed (status is pending/completed everywhere in the data path); `lines={2}` to `compact`; `c.comment`/`c.author_name` to `c.text`/`c.author` (+ 'Someone' fallback); label 'Add a progress update' per spec; shared `Field` gained `labelClassName` (tested). Other session to review |
| 42 | Tools sidebar used NavSpotlight (dark square) where the main shell uses brand + active item | HIG consistency | `tmp/phase2-shots/tools-sidebar-nospot@1440.png`, rail capture | Spotlight slot now holds `ShellBrand`; current section renders as an active `NavItem` (exclusion filter removed). Viewed expanded + collapsed. `NavSpotlight` kept as tested shared API with zero callers |
| 43 | plotly.js + react-plotly.js installed, zero imports | No dead weight | `package.json` only | `npm uninstall` both; production build green (exit 0, 64 static pages) |

## Verified — no action needed

| # | Area | Result |
|---|------|--------|
| 8 | No silent failures | Every `catch` surfaces via toast, `setError` or re-throw (30+ sampled). The four `.catch(() => {})` are exonerated: leave "Mark pending" toasts inside `changeStatus`, maintenance stranded-uploads are best-effort background sync, audio resume is autoplay-policy noise |
| 9 | Focus visible | Global `:focus-visible` outline in `base.css` plus `focus-ring` opt-out; axe 0 violations on all routes |
| 10 | Destructive confirmation | sampled deletes (equipment, issues, leaves, documents) all confirm with specific labels and undo notes where supported |
| 11 | Loading/empty/error states | 42 routes render `DataRegion`; `EmptyState` everywhere with real lists; redirect stubs (`/av`, `/employees-preview`, `/leave-management`) and auth forms correctly have none |
| 12 | Form feedback | `FormDialog` centrally blocks double-submit + dismissal while saving and shows failures inline; `pending` on async buttons |
| 13 | Labels | No "Click here / Submit / OK" buttons; confirms use action labels ("Delete folder", "Set to pending") |
| 14 | Keyboard | Zero clickable div/span/li/p in `app/`; no traps (Radix-managed dialogs/menus); skip link and roving tabs covered by prior audits |
| 15 | File size | Zero files over the 600-line eslint rule |
| 16 | Touch targets | `touch-target` (44px coarse) on Button, IconButton, Segmented, ViewToggle |
| 17 | Permissions | `ApprovalGate` is the one no-permission surface (signed-out + wrong-role copy); admin Tools filter by role at UI level |
| 18 | Card duplication | 15+ `rounded-card border-line bg-surface` sections share the look through tokens; gaps/padding genuinely vary, so a component would move variation, not remove it |
| 19 | Preview dl's | LeaveForm/ArtisanEditor previews are similar but not identical and live in form context — not shared-component candidates |
| 20 | Contrast | Ink-muted on surface measured 6.28:1; linen audit + axe green |
| 32 | Chart a11y posture | All 22 Recharts instances carried `accessibilityLayer={false}` inside ChartPanel's `aria-hidden` + required `summary`; DOM probe: 0 tab stops, axe `aria-hidden-focus` 0 — the axe-green stands (now guaranteed by the `Chart` frame) |
| 33 | Tools sidebar | Uses the universal system (`NavItem`/`NavSpotlight`/`SidebarFrame`/`AppFrame`) and the app-wide icon set; README drift corrected |
| 34 | Full-suite failures triaged | First rerun 1615/6 (4 harness-side, fixed #29-31); final run 1649/2 (tasks-events WIP, fixed #41); confirmatory run 1624/4 — all 4 overtime-ready, a one-off timing flake (no browser errors; green in isolation on identical code and in both prior full runs; nothing changed in that render path) |
| 35 | Tools drawer "Not recorded" | Plain (not quiet-italic) by decision: the Tools skin keeps its own look per the brief; a conscious divergence, not drift |
| 36 | Sign-in re-shot after dead-code deletion | Visually identical; 3.8% pixels differ in the sweep band. Control: two no-change pairs differ 1.0% and 0.6% in the same band — a code regression would be deterministic, so the variance is the intentional sweep phase |
| 40 | Collapsed rail shows a doubled avatar at the bottom, on Tools and main rails identically | Pre-existing shared chrome (other-session shell territory); recorded, not touched |

## Reported, not fixed (needs owner or another session)

| # | Finding | Reason |
|---|---------|--------|
| 21 | `tasks-events/dialogs.tsx`: was 5 tsc errors + 2 spec fails from half-finished comment-model work | FIXED under owner delegation — see #41. The other session should review the diff before building on it |
| 22 | Six empty route dirs (`equipment-status`, `failure-modes`, `handover`, `lubrication`, `production`, `schedules`) | Untracked local residue; may be scaffolding — owner to confirm removal |
| 23 | `app/timesheets - Copy/` | Other session's folder; untouched (also keeps `docs:check` red) |
| 24 | WCAG 2.2 delta (2.4.11 focus-not-obscured, 2.5.8 target-size-24) | Installed axe covers 2.1 tags only. Assessed in source: dialogs trap focus inside; toasts are transient/dismissible; 44px coarse targets exceed the 24px minimum. No violations found; a 2.2-tagged axe run needs an axe-core upgrade (owner decision) |
| 37 | NavSpotlight only in Tools (dark square) vs plain active NavItem in the main shell | DECIDED: dropped from Tools — see #42 |
| 38 | plotly.js (4.6MB) + react-plotly.js installed, zero imports anywhere | DECIDED: removed — see #43 |
| 39 | Selected-state pill boundary (Segmented, ViewToggle, radio cards): fill vs track 1.04:1, hue-only | DECIDED: kept. Same language everywhere by design; state also carried by darker selected text (9.87:1) + `aria-pressed` programmatically |

## Screenshot review

Viewed (not just captured): bg leaves before/after @1440 (net unchanged on that page, static — the win is app-wide rollout + 0 rAF);
login stage vs after-deadcode (visually identical, 3.8% sweep-phase pixels); spotlight row before/after (sub-perceptual radius fix,
pinned by `Nav.test`); Segmented clips are the BEFORE state (white pill + shadow) — after-shots queued for final verify;
issue-form dialog (clean; surfaced #26); leaves detail @1440 (hierarchy, quiet Delete, "Working days only" all correct);
shifts detail @390 (surfaced #25: wrapped footer); tools drawer foot (surfaced #35). Detail families not re-viewed this pass
(employees, breakdowns, maintenance, spares @1440) share the same components; final verify re-renders every route at both widths.

Phase 3 chart renders (light/dark, motion/reduced-motion, 1440/390) go to `tmp/phase3-shots/` with the final verify.
