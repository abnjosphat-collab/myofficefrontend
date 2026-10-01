# Paste-ready prompts for Claude

## Prompt A — full MyOffice takeover

Paste this into a new Claude Code or Claude IDE session opened at
`C:\Users\Administrator\Documents\studio\myoffice`:

```text
Continue the MyOffice engineering audit and transformation from the current
repository state.

Before editing anything, read:
- frontend/AGENTS.md and frontend/CLAUDE.md
- frontend/docs/CLAUDE_HANDOFF_2026-09-30.md
- frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md
- frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md
- frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md
- docs/PRODUCT.md and docs/ENGINEERING_PRINCIPLES.md
- frontend/docs/ENGINEERING_STANDARDS.md
- frontend/components/shared/design-system/README.md

Then inspect both independent Git repositories, their branches, logs, status,
untracked files and current diffs. The workspace root is not a Git repository.
Preserve every existing change. Do not reset, stash, checkout over, broadly
reformat, normalize line endings, commit, push, deploy, run a migration, or
modify live business data unless I explicitly request it.

Current expected checkpoint:
- frontend main is at pushed commit 5c26209 and has intentional uncommitted
  /tools changes plus new toolsSession.ts and toolsSession.test.ts.
- backend main is at pushed commit d2e0e2a and is clean.
- the uncommitted Tools work removes equipment icons from register tiles,
  removes Tools appearance/icon-family switching, introduces one soft neutral
  tonal theme, redesigns the department selector, adds browser-local versioned
  session handling, and makes logout open the required sign-in/sign-up dialog.
- do not restore the rejected black-heavy header/card design.

First finish the exact immediate checkpoint in the handoff: signed-in rendered
verification of the dirty /tools pilot at desktop and about 390px, then logout
verification. Ask at action time before submitting saved browser credentials.
Allow Supabase free-tier wake-up time. Do not mutate business records. Check
populated equipment cards, department selector, hover/focus states, grid/list,
Settings, overflow and console errors. Fix only concrete defects found. Run
focused tests, TypeScript, lint, git diff --check and a production build. Update
the dated audit with what actually passed and what remains unverified.

After that checkpoint, do not silently start a broad refactor. Present a
measured plan for the latest product direction: retire Classic as a runtime
option so Dallaglio is the sole design, while preserving the Classic archive
and translating its useful behavior/accessibility principles. Classic runtime
retirement is documented but not yet implemented.

Maintain a visible work queue because I may add requirements while you work.
Never mark work complete from code changes alone. Distinguish implemented,
automated-tested, browser-verified and still-open items in every handoff.
```

## Prompt B — immediate Tools checkpoint only

Use this shorter prompt if Claude should finish the current dirty work before
considering broader MyOffice changes:

```text
Work only on the current uncommitted /tools checkpoint in
C:\Users\Administrator\Documents\studio\myoffice.

Do not edit immediately. Read frontend/AGENTS.md,
frontend/docs/CLAUDE_HANDOFF_2026-09-30.md,
frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md and
frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md. Inspect frontend and backend Git
status and the complete frontend app/tools diff. Preserve all existing changes.

Finish signed-in rendered verification of the new soft-monochrome tonal Tools
pilot. Ask before submitting saved credentials. Wait through reasonable
Supabase free-tier wake-up delays. Use read-only browser flows and do not change
live records. Verify populated equipment cards have no equipment icons, never
lift/scale, change shade and show a restrained glow on hover/focus; verify the
light header, labelled department selector, semantic status colours,
grid/list, Settings, desktop and 390px overflow. Then log out and verify the
non-dismissible sign-in/sign-up dialog appears immediately.

Fix only defects found. Do not restore dark-heavy cards, a theme toggle,
background previews, duplicate text-size controls or equipment icon-family
settings. Run focused lint, TypeScript, the isolated Tools tests, git diff
--check and next build. Record actual evidence in the audit. Do not commit,
push or deploy unless I explicitly ask.
```

## Prompt C — Classic retirement planning after Tools is clean

Use this only after the dirty Tools checkpoint has been verified and safely
committed or otherwise preserved:

```text
Plan the MyOffice Classic runtime retirement without implementing broad changes
yet.

Read frontend/docs/CLAUDE_HANDOFF_2026-09-30.md and
frontend/docs/CLASSIC_DESIGN_SYSTEM_ARCHIVE_2026-09-29.md first. Inspect the
live repository and reconcile older dual-design documentation with the latest
decision: Dallaglio becomes the sole runtime design; Classic principles remain
archived and translated, but Classic styling, selectors, tokens, icon maps,
route branches, persistence and smoke tests must eventually be removed.

Produce a phased, file-specific plan with acceptance criteria and rollback
points. Inventory pre-paint logic, ThemeProvider/design persistence, app-shell
preferences, shared tokens/components/icons, Classic/Paper/Studio CSS bases,
route branches, tests and browser scripts. Identify behavior and accessibility
that must survive each deletion. Do not mix this migration with unrelated
business-rule work, and do not edit until the plan is reviewed.
```

