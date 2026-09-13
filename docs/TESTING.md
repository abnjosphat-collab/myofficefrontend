# Testing (frontend repo)

MyOffice has **two independent test suites** (frontend + backend). Both are fast, need no live server, database, or Redis, and mock external services.

## This repo (Vitest)

```bash
npm test          # single run
npm run test:watch
npx tsc --noEmit  # types — run before claiming UI work done
```

Notable coverage:

- `app/timesheets/calcTotals.test.ts` — NEC Actual / Reg / OT caps and Excel addends.
- `lib/*.test.ts` — `authFetch`, usage analyzer derivations, etc.

These are unit/contract tests — not full end-to-end against a live DB.

## Backend repo (pytest)

```bash
cd ../backend   # sibling checkout
./venv/Scripts/python.exe -m pip install -r requirements-dev.txt
./venv/Scripts/python.exe -m pytest -q
```

See backend `docs/TESTING.md` for file-by-file coverage.
