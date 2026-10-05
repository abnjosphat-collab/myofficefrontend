<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MyOffice (this repo)

- **Product / quality brief:** workspace `docs/PRODUCT.md` (parent `myoffice/` folder) or [docs/PRODUCT.md](./docs/PRODUCT.md).
- **Frontend wiring rules:** [docs/ENGINEERING_STANDARDS.md](./docs/ENGINEERING_STANDARDS.md).
- **UI system:** [components/ui-system/README.md](./components/ui-system/README.md).
- **Documentation map:** [docs/README.md](./docs/README.md). Public contracts use JSDoc and are validated with `npm run docs:check`.
- **Cursor:** `.cursor/rules/myoffice-core.mdc` at workspace root; skill `.claude/skills/myoffice-conventions/`.

## Working rules (the owner's standing instructions)

- **Where things stand:** [docs/CURRENT_HANDOFF.md](./docs/CURRENT_HANDOFF.md) is the single source for what is done, what is open and what the owner decided. Read it first; keep it current when you finish something. The backend is a separate repository (`myofficebackend`, FastAPI + Supabase) with its own `AGENTS.md`.
- **Never** commit, push, deploy, run database migrations or change live records unless the owner says so in that conversation. Work on a branch, not `main`. A push to `main` deploys to production (frontend on Vercel, backend on Render).
- Preserve edits you did not make. Never blanket-commit the working tree; `git status` first and stage by path.
- Done means verified: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run docs:check`, and for UI work the route specs (`MSYS_NO_PATHCONV=1 node scripts/verify-routes.mjs --only /route`) and a look at the rendered page. Say plainly what you could not run.
- One design system: `components/ui-system`. Do not add a second set of components, colours or typography rules. `/tools` keeps its own components by the owner's decision.
- A failed request is never shown as an empty list; a read that fails because the service is slow keeps loading (`lib/transientRetry.ts`).
- Do not put credentials, keys or private records in code or documents.
- Keep temporary progress notes out of this file; they belong in the handoff.
