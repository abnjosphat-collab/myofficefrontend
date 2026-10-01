# MuseOffice extraction plan — Phase 1

**Source:** MyOffice `frontend/app/tools` at frontend `main/a992afd` (+ uncommitted
Muse handoff docs), backend `main/d2e0e2a`.
**Target:** standalone app in `myoffice/MuseOffice/`, workspace served at `/`.
**Rule:** existing MyOffice `/tools` stays intact until MuseOffice reaches verified
parity **and** the user explicitly approves retirement. No commit/push/deploy/
migration/live-data change without an explicit request.

## 1. Functional inventory (10 workspace sections + cross-cutting)

| # | Section (tab value) | Capability |
|---|---|---|
| 1 | Equipment (`register`) | Register grid/list, fuzzy search, status/category/location/department filters, sort, equipment detail dialog, create/edit/archive/restore, mark-ready, undo/redo, pre-use checks |
| 2 | In use (`loans`) | Issued/overdue custody list, return/transfer/extend, overdue derivation + 6h escalation |
| 3 | Employees (`employees`) | Department-grouped register, employee detail + custody, searchable eligibility matrix, tool-specific trained/qualified/authorised quick-assign |
| 4 | Compliance (`compliance`, signed-in) | Competency register, inspections (pre-use/weekly/monthly/quarterly/calibration/maintenance/storage-audit/repair) with due-state + provisional quarterly colour, maintenance recording, return-to-service, incidents (report/investigate/close, negligence, recovery), repair-vs-replace threshold |
| 5 | Gate passes (`gate-passes`, signed-in) | Request, sequential HOS→HOD→Security→(Finance)→GM approvals, password/PIN reauthentication, signed PDF + verification code |
| 6 | History (`activity`) | Immutable movement journal, register-number links |
| 7 | Source registers (`sources`, signed-in) | Preserved upload metadata, signed-URL downloads |
| 8 | Account access (`accounts`, admin) | Role/department assignment, approval roles, signing-PIN setup, promote/revoke |
| 9 | Analytics (`analytics`, admin) | Usage trend (Recharts), usage heatmap, feature chart, appearance ring, error list, ranges |
| 10 | Feedback (`feedback`, admin inbox) | Admin inbox (text + audio); every signed-in user can submit text/voice feedback |

Cross-cutting: ToolsAuth (register/login/logout, browser-local versioned session,
`/auth/me` verification); notifications panel (per-account reads); workspace-wide
command search; CSV/XLSX/PDF export; XLSX import preview/commit; Settings
(typography Inter/Manrope/Jakarta + 85–130% scale, layout order/hide, guidance
toggle); guide carousel; sonner toasts; global error capture to
`POST /analytics/errors`; undo/redo via `/changes/{direction}`.

## 2. Roles and authorization

Viewer reads all permitted registers; Issuer is department-scoped for register,
compliance and custody movements; Administrator manages accounts/register/imports/
evidence/analytics but cannot record custody movements unless separately assigned
an Issuer account. Approval roles (HOS/HOD/Security/Finance/GM) are independent
of workspace role; signing requires password or numeric PIN reauthentication.
Backend is authoritative: department scoping, eligibility (`trained &&
qualified && authorised`, expiries current), pre-use confirmation and sequential
approvals are all re-checked server-side.

## 3. Domain and data contracts

- **UI types** (`prototype.ts`): `Tool`, `Employee`, `Movement`, `Evidence`,
  `WorkspaceAccount`, `Status`, `EquipmentKind`.
- **Server types** (`workspaceLoad.ts`): `ServerTool`, `ServerEmployee`,
  `ServerHistory`, `ToolNotification`, `ServerAnalytics`, `ServerAccount`,
  `WorkspaceLoadValues`.
- **Compliance types** (`complianceTypes.ts`): `CompetencyRecord`,
  `InspectionRecord`, `IncidentRecord`, `GatePass`, `GatePassApproval`,
  `ComplianceData`.
- **API:** direct `fetch` to `${NEXT_PUBLIC_API_URL}/api/tools-workspace/*`
  (38 endpoints: auth, accounts, notifications, employees, tools, archive,
  mark-ready, compliance, competencies, inspections, incidents, gate passes +
  PDF, history, analytics, feedback, commands/issue/return, evidence,
  source registers, changes, imports). No Next.js API proxy exists or is
  needed. Typed `ToolsApiError{message,status}`; FastAPI validation arrays
  flattened by `toolsErrorMessage`.
- **Session:** `myoffice.tools.session.v2` envelope
  `{version:1,browserId,account}` (+ `myoffice.tools.browser.v1`);
  `myoffice.tools.session.v1` plain account auto-migrates. Verified via
  `/auth/me`; 401 clears with truthful re-sign-in message. Keys are kept
  byte-identical (origin-scoped, so no clash across ports; enables a future
  same-origin cutover).
- **Source-state model:** 8 sources (employees/tools/history/sources/
  notifications/compliance + admin analytics/accounts) load progressively via
  `loadToolsWorkspace` with unbounded transient (502/503/504 + network)
  wake-up retries, per-source shape validation, sequence guards against stale
  responses, preserved snapshots + "may be out of date" on quiet failure, and
  explicit unavailable/retry states on initial failure. Failed reads never
  render as zeroes or empty registers.

## 4. Dependency map

**Tools-owned → copied verbatim into `components/tools/`:** all 28 source
files + `tools.module.css` (103KB self-contained theme: near-white canvas
`#f4f6f5`, charcoal-green `#233b31`/`#182620`, pale sage, mineral-green focus
`#4f806a`, 7px radius, no-lift tiles), all 9 colocated test files, `ToolSymbol`.

**MyOffice-provided → replaced with MuseOffice-owned equivalents (3 only):**

| Import | Replacement |
|---|---|
| `@/lib/config` (`API_BASE`) | New `lib/config.ts`, same export, same `@/*` alias → zero rewrites in copied files |
| `@/components/shared/design-system/charts` (`chartTheme`) | New `lib/charts.ts` with the Dallaglio branch only → one import rewrite in `ToolsAnalytics.tsx` |
| `@/components/shared/design-system` (`Laptop,ToolCase,Wrench`) | Direct `@phosphor-icons/react` imports (`Laptop,Toolbox,Wrench`) → one import rewrite in `EquipmentIcon.tsx` |

**Root shell → rebuilt minimal:** root `layout.tsx` (Inter/Manrope/Jakarta/
Geist-Mono via `next/font/google` with identical `--font-*` variables,
`<Toaster/>`, Tools metadata, no AppShell/Providers/Classic); `globals.css`
(mini-preflight: border-box, body margin, font — Tools uses **zero** Tailwind
classes, so Tailwind is dropped); `public/` icons + manifest (start_url/scope
`/`; manifest theme colors corrected to the tonal palette).

**Deliberate API contract (not copied):** `backend/app/routers/
tools_workspace.py` + applied migrations + shared Supabase project stay as-is.
MuseOffice is a frontend/product-shell extraction, not a data split.

**npm packages (from proven frontend versions):** next, react, react-dom,
framer-motion, sonner, recharts, exceljs, file-saver, jspdf, jspdf-autotable,
xlsx (same SheetJS tarball URL), docx, mammoth (Word import/export),
recharts **pinned to 3.5.1** (the version proven in MyOffice; newer 3.x
tightened the Tooltip Formatter types and breaks the copied analytics code),
@phosphor-icons/react,
@radix-ui/react-dialog, @radix-ui/react-tooltip, @tabler/icons-react,
iconoir-react. Dev: typescript, vitest, @vitest/coverage-v8, jsdom,
@testing-library/react + jest-dom + user-event, eslint, eslint-config-next,
playwright, @types/*.

## 5. Standalone architecture

- **Routing:** single-route app; workspace at `/` (`app/page.tsx` holds the
  copied page component; all other files move together to `components/tools/`
  so mutual `./` imports stay valid — only `page.tsx` import prefixes change).
- **Providers:** none (Tools owns its theme via CSS module + `ToolsPreferences`
  context; MyOffice `Providers`/access boundary are deliberately excluded —
  `/tools` already bypasses them via the public-workspace path).
- **API client:** direct fetch to backend (unchanged); dev port **3002**
  (inside backend CORS allowlist, no clash with MyOffice on 3000/3001).
- **State ownership:** page-level `useReducer`/state + `workspaceLoad`
  coordinator, unchanged; preferences in `myoffice.tools.preferences.v1`.
- **Testing/build:** own `package.json` scripts (`dev/build/start/lint/
  test/test:coverage`), vitest + jsdom, `scripts/verify.mjs` adapted from
  `verify-tools.mjs` (root route `/`; **v2 session-envelope read** — see
  finding F1; all existing assertions kept incl. focus-halo, no-lift hover,
  single-loader, 390px overflow).
- **Verification:** copied unit tests must pass unmodified (parity signal);
  tsc + eslint + production build; read-only browser verifier (all non-GET
  blocked, fixtures only); screenshot parity pass MyOffice `/tools` vs
  MuseOffice `/` at 1440px + 390px.

## 6. Migration / cutover strategy

1. Build + verify MuseOffice with `/tools` untouched (this plan).
2. Present verified result + cutover options; **stop** — no cutover without
   explicit approval.
3. Cutover options for later decision (not this task): subdomain/reverse-proxy
   split, same-origin subpath, or Vercel project split with `ALLOWED_ORIGINS`
   update. Data layer needs no migration (shared backend/Supabase by design).

## Findings

- **F1 (verifier/session drift):** `scripts/verify-tools.mjs` seeds and reads
  the legacy `myoffice.tools.session.v1` plain-account key, but current
  `toolsSession.ts` migrates v1→v2 on load and deletes v1 — so the verifier's
  post-load v1 read cannot observe the session it seeded. MuseOffice's
  verifier seeds v1 (exercising migration) and asserts the v2 envelope.
  MyOffice files are left untouched; this is reported, not fixed there.
- **F2 (stale manifest theme):** `manifest.webmanifest` still declares
  `#f8f7fb`/`#17151f` (old violet direction). MuseOffice corrects these to
  the tonal canvas/charcoal-green. Same for the `NEXT_PUBLIC_SITE_URL`
  fallback, which stays env-driven.

## Decisions (no blocking questions)

D1 Keep Next.js 16 + React 19 + TS (proven) — no framework change.
D2 Workspace at `/`, not `/tools` (true standalone product shape).
D3 Keep `@/*` alias + `lib/config.ts` shape (zero rewrites in copied files).
D4 Same backend + Supabase (no data split without explicit approval).
D5 Same localStorage keys (origin-scoped; future cutover-compatible).
D6 Drop Tailwind (zero usage; mini-preflight instead).
D7 Dev port 3002 (CORS-allowed, clash-free).
D8 Copy-first parity, then restrained documented polish (each visual change
records *why it improves the same direction*; verifier pins focus halo,
no-lift hover, loader count, overflow).
