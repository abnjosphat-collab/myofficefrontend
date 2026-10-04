# Design system migration — inventory & phases

**Purpose:** Track ERP-wide UI consistency work. Visual reference: the Tools workspace (`/tools`) — near-white/mineral-green, stationary cards, calm motion. Colour rules: [`COLOR_HARMONY.md`](COLOR_HARMONY.md). Canonical tokens: `components/shared/design-system/tools-theme.css` (`--mo-*`); see the design-system README for the theme + appearance contracts.

## Reference tile chain (Tools standard — supersedes the old glowing homepage tiles)

```
Register/dashboard cards anywhere
  → InfoCard (iconTone default neutral, calm hover)
    → GlowCard → DallaglioCard (stationary; shadow-only hover, no lift/glow)
      → motion: emergeContainer / emergeItem / emergeProps (180ms, capped stagger)
      → tokens: --mo-* canonical; --d-* / --brand-* aliases
```

List pages should prefer **`RecordCard`** + **`GroupSection`** + **`PageHero`** rather than raw `GlowCard` or page-local card markup.

## App shell inventory (Sep 2026)

| Layout | Routes | Notes |
|--------|--------|--------|
| **`AppShell`** | 56+ `app/**/page.tsx` module pages + `/` | Standard sidebar + top bar + bottom bar |
| **Standalone auth** | `/login`, `/auth/callback`, `/auth/set-password` | Intentionally **no** AppShell (full-screen auth) |
| **Redirect** | `/standby` → `/shifts` | No UI |
| **Removed** | ~~`/homepage`~~ trial, ~~`PageShell`~~, ~~`Header`~~, ~~`Footer`~~ | Deleted Sep 2026 — zero imports remained |

## Legacy `.oz-*` (globals.css)

CSS utilities remain in [`app/globals.css`](../app/globals.css) until unused. **TS/TSX class usage (Sep 2026):**

| File | Status |
|------|--------|
| `PredictiveInput.tsx`, `EmployeeNameInput.tsx` | **Migrated** → `DROPDOWN_PANEL_ANIM` + `t.glassPopover` |
| `ApprovalGate.tsx` | **Migrated** → `t.glass` / theme text |
| `components/safety/index.tsx` | **Migrated** panel wrappers (hero still uses legacy white-on-dark copy in places) |
| `lib/prefs.ts`, `lib/usage.ts`, `useNotifications.ts` | Event **names** only (`oz-prefs-changed`) — not CSS |

Do not add new `.oz-*` visual classes.

## Status hex (`STATUS_TONE` rollout)

| Module | Status |
|--------|--------|
| `app/maintenance/helpers.ts` | Done |
| `app/maintenance/page.tsx` `CLASS_COLORS` | Done |
| `app/spares/page.tsx` hero stat | Done |
| `app/spares/import/page.tsx` | Done |
| `app/shifts/page.tsx` event/status colours | Done |
| Other `app/**` pages | Migrate when editing (grep `#ef4444`, `#34d399`, etc.) |

## Phase checklist

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | This inventory doc + README cross-links | Done |
| 1 | Homepage launcher + quick-action curation | Done |
| 2 | App shell colour harmony | Done |
| 3–6 | Shared components + theme split + CSS vars | Done |
| 7 | Dialog bridge | Done |
| 8 | `.oz-*` visual class migration (shared widgets) | **Done** (safety hero copy still dark-tinted — optional follow-up) |
| 8b | Retire `Header` / `PageShell` / `Footer` | **Done** |
| 9 | `/homepage` trial | **Removed** |
| 10 | `STATUS_TONE` on maintenance / spares / shifts | **Done** |
| 11 | Visual regression baselines | Run `npm run test:visual -- --update-snapshots` when dev server on `:3000`; commit `-win32.png` locally; CI uses `-linux.png` |
| 12 | Tools-standard rollout (Stages A–D) | **Done** (Oct 2026, uncommitted): `--mo-*` canonical tokens, `myoffice_appearance_v1` prefs, calm motion everywhere, forest accent system, icon barrel + 22 meanings, metadata fixed. Deferred: Linux visual baselines + `continue-on-error` removal (needs CI run + human commit); signed-in live verification; Timesheets (separate ChatGPT track). |

## Verification

```bash
cd frontend
npx tsc --noEmit
npm run test
npm run test:visual   # requires app on localhost:3000 (e.g. npm run dev)
```

## Completion criteria (ERP-wide)

- [x] Single import path: `@/components/shared/design-system` or `@/components/shared/theme` shim
- [x] Documented colour layers + theme split
- [x] Modals: CenterModal standard; Radix dialog aligned
- [x] All module routes on `AppShell`; legacy shell deleted
- [ ] Remaining pages: stray status hex (incremental)
- [ ] Trim unused `.oz-*` rules from `globals.css` once grep-clean
- [x] Tools-standard rollout: one `--mo-*` token source, one appearance contract, calm motion, forest accents (Oct 2026)
- [ ] Linux visual baselines committed; visual `continue-on-error` removed
- [ ] Signed-in live verification pass with real credentials
