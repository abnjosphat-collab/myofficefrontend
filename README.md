# MyOffice — Frontend

Next.js (App Router) frontend for the MyOffice ERP. Talks to the sibling
[`backend/`](../backend) FastAPI service for real modules (personnel,
maintenance, timesheets, SHEQ, etc.) and Supabase directly for auth. A
handful of routes (`bank`, `roomRental`, `restaurant`, `cv-builder`, and
similar) are self-contained frontend-only demo/vertical prototypes with no
backend calls at all — that's intentional, not a gap.

See the root [`README.md`](../README.md) for how the two repos run together.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in the backend URL + Supabase keys
npm run dev
```

Open `http://localhost:3000`. If port 3000 is already taken, Next.js silently
falls back to the next free port (3001, ...) — check the dev server's own
startup log to see which port it actually bound to.

### Environment variables

See `.env.local.example` for the full list. All three
(`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) are required — pages that hit the backend or
Supabase will fail without them.

## Architecture

- **`app/`** — one folder per route (App Router). Most real modules follow a
  `page.tsx` + `types.ts` + `useXData.ts` hook split (data model / data-fetching
  layer / rendering) — see any recently-touched page for the pattern before
  adding a new one.
- **`components/shared/design-system/`** — the shared component library
  (`PageHero`, `StatTile`, `RecordCard`, icons, theming). **Read its own
  [`README.md`](components/shared/design-system/README.md) before building a
  new page** — it documents real anti-patterns other pages have shipped and
  since fixed, not just a component list.
- **`components/app-shell/`** — the sidebar/module-grid shell (`AppShell`) that
  wraps every real ERP page (not the demo verticals).
- **`lib/apiClient.ts`** — the one place that attaches the Supabase auth token
  to backend requests. Don't hand-roll `fetch` calls to the backend elsewhere.
- **`lib/auth-context.tsx`** — the real `AuthProvider`/`useAuth`. (There is no
  longer a second one — an orphaned duplicate under `contexts/` was removed
  2026-07-30 after it was found to have identical export names but be missing
  MFA gating, a real trap for an accidental import.)

## Testing

See [`../TESTING.md`](../TESTING.md) for the full picture (both repos). Short
version:

```bash
npm test              # Vitest unit tests (lib/*.test.ts)
npm run test:smoke     # Playwright smoke suite — needs `npm run dev` running first
```

The smoke suite (`e2e/smoke.mjs`) navigates every route and a few targeted
interaction flows, mocking all `/api/**` calls — it catches "page doesn't
render/crashes on load," not real-data correctness.
