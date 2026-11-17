# Overtime reliability - 17 November 2026

Owner authorized release on 17 November 2026. Branch `fix/overtime-reliability-20261117`; publishing in progress, not yet certified live. Backend fixes published as `38d23de`, with the CI-required dnspython patch in `883fb6b`. Original checkouts and unrelated Training edits preserved. No migration or operational write performed.

## Changes

Confirmed saves/deletes update the register immediately without a whole-register read. A stale refresh cannot restore a deleted row or remove a just-saved row. Lost delete responses trigger one scoped detail read, never an automatic second delete. Uncertain saves retain the form and say `Save not confirmed`; the register is refreshed before a manual retry. Authoritative refusals still display the server's reason.

The backend moves blocking database work off the event loop and excludes signature images in SQL list projections. It can reconcile an uncertain insert by the exact server timestamp for that attempt, without replaying the write. Existing permissions, approval, audit, trash and payroll rules are preserved.

## Build compatibility

Next.js rejected pre-existing helper exports from 12 page modules and the budget route. Each affected page forwards its default export to same-folder `PageContent.tsx`. Implementations match the previous pages after normalizing Git line endings; their location changes only. Tests import named helpers from the implementation. `bookPath` moved to its own module. The documentation ledger classifies the implementation behind thin entrypoints.

## Evidence and limits

- Backend full suite: **3,013 passed**, coverage **92.80%**. Pyright **189**, inherited maximum **196** unchanged.
- Overtime/dialog/delete tests: **146 passed**; refresh hook: **17 passed**.
- Initial compatibility suites: **63 passed**, one Excel cold-import timeout and one worker startup timeout. Targeted rerun of the affected suites plus shared date defaults: **23 passed** (60-second cold-import allowance). No full frontend coverage pass claimed.
- Changed-file ESLint passed. Final webpack production-mode compilation, generated route TypeScript validation and static generation **passed**, using the cached-font fixture described below.
- Documentation ledger, links, CSS, export and refresh checks passed. Motion check passed but inventory was absent, so coverage was skipped. TypeDoc: 0 errors, 26 existing documentation warnings before the compatibility move.
- Final **built-app browser checks all passed**: create/edit/bulk/delete, exact lost-delete-response reconciliation, approval/lieu controls, analysis, weekly Excel export, empty/error/retry states, and no horizontal page overflow at 390/820/844/1180 pixels. Desktop 1440 and mobile 390 screenshots inspected. All records/session/API writes were fixtures; no production test records. Logs/screenshots: task workspace `work/ot-browser-final.log` and `work/ot-browser-final/`.
- Earlier development-server attempts hit cold-compile/router/font errors. An initial built-app create fixture lacked server-owned status/timestamps and produced a browser error; its corrected realistic response passed. Those failed attempts are not counted as passing checks.
- Normal build could not fetch Google Fonts. Local verification uses Next.js's test-response hook with actual cached MyOffice font bytes, stored outside Git. This is not an online Vercel build and must not be deployed as configuration.
- Production read-only inspection found the incorrect 30 November request already in Recently deleted at 05:26 UTC on 17 November. No second deletion attempted. Render service discovery returned null; exact create-error reference remains uncorrelated with logs.

## Release

Local verification complete; owner release approval received under [ENGINEERING_PROCESS.md](./ENGINEERING_PROCESS.md). Deploy backward-compatible backend first, then preview and production frontend; verify deployed commits, provider font download/build and signed-in behaviour. No production test payroll records. Rollback: scoped code revert; no data rollback needed.
