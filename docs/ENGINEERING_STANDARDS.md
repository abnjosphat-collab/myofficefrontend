# Frontend engineering standards

Short, on purpose. Four rules, each pointing at a real example already in this
codebase — this is the wiring standard, not a process. Not enforced by CI yet;
follow it because it's the pattern that's already proven out, not because
something will block your PR if you don't.

## 1. Page-local business logic gets its own file

If a page does a nontrivial calculation — not just fetching and rendering,
but computing something (totals, groupings, eligibility, matrix math) — pull
it into a sibling `calcX.ts`, not inline in `page.tsx`.

Model: `app/timesheets/calcTotals.ts`. It's the only module with this split
today, and not by accident — every real payroll bug found this session
(overtime hours double-counted into Actual, night allowance paying a flat 8h
instead of real hours, holiday hours miscounted) lived in logic that had no
test touching it, because it had nowhere to *put* a test — it was buried
inside a 1000+ line `page.tsx`. A `calcX.ts` file is directly importable and
directly testable with plain `describe`/`it` (see `lib/dates.test.ts` for the
house style: one `describe` per function, a comment on each test tying it
back to the specific bug it guards against, plain `expect(x).toBe(y)`, no
snapshot testing).

This is a `vitest.config.ts` note too: the `include` glob is scoped to
`lib/**/*.test.ts(x)` today. A `calcX.test.ts` under `app/*/` needs that glob
widened to pick it up — do that as part of adding the first one, not as a
silent gap.

## 2. Every `useXData.ts` follows the pattern that's already everywhere

38 of the app's modules already split data-fetching into a sibling
`useXData.ts` hook (e.g. `app/ppe/usePPEData.ts`, `app/overtime/useOvertimeData.ts`) —
that's the dominant, working pattern; keep using it for new modules rather
than growing `page.tsx` into its own data layer.

For actually-shared lookups (employees, equipment, spares, a growing
pick-list), reach for `hooks/useLookups.ts` (`useEmployees`, `useEquipment`,
`useSpares`, `useLookupList`) or the `Autocomplete`/`MultiPicker` components
built on them (`components/shared/EmployeeAutocomplete.tsx` etc.) before
writing a new fetch-and-cache — that hook's own header comment records that
`useEmployees`/`useEquipment`/`useSpares` were each copy-pasted into 6+ pages
before being pulled out once.

## 3. Never let a failure look like an empty state

A failed load, save, or delete must be visible — `toast.error(...)` (the
house pattern, see `sonner` usage across the app) or an explicit rendered
error state. Never a bare `catch {}`, `catch (e) { console.error(e); }`, or
`.catch(() => [])`/`.catch(() => null)` with nothing surfaced. A user (or an
on-call operator) has to be able to tell "there's genuinely nothing here"
apart from "the request failed and nobody knows."

Concrete shapes to avoid, both found live this session:
- An approve/reject/delete action whose `catch` only logs to the console —
  the spinner just stops, nothing explains why.
- A combo box / autocomplete whose failed initial load marks itself
  "fetched" anyway, so it never retries and just sits empty forever.

Route new API calls through `lib/apiClient.ts`'s `api.get/post/put/patch/delete`
— it already throws a typed `ApiError` with the backend's real message
extracted (including FastAPI's validation-array shape) and offers a sign-in
toast on 401, so there's something meaningful to put in the toast. Prefer it
over raw `authFetch` (`lib/api.ts`) or the older generic hook
`lib/useModuleData.ts` for new code — neither of those enforces surfacing
what they catch.

## 4. Coverage is visible now — use it, don't chase a number

`npx vitest run --coverage` (also what CI runs) shows a real percentage
against `lib/**`, `app/**`, `components/**`, `hooks/**`. It's report-only, no
threshold gate. There's no component-testing library installed yet
(`@testing-library/react` etc.) — extracting logic into a `calcX.ts` (rule 1)
is what actually makes something here testable without adding that
infrastructure first.
