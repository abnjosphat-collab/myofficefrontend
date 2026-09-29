# Frontend documentation standard

**Audience:** developers, IDE language services, code-review tools, and coding agents

## Documentation layers

| Layer | Format | Purpose |
|---|---|---|
| Repository instructions | `AGENTS.md` | First-read constraints and links for coding agents |
| Architecture and operations | Markdown in `docs/` | Decisions, workflows, failure semantics, and verification |
| Public TypeScript contracts | JSDoc/TSDoc `/** ... */` | IntelliSense and generated API reference |
| Component behavior | Design-system README and focused tests | Usage, accessibility, and interaction contracts |
| Generated API reference | TypeDoc | Searchable view of exported TypeScript APIs |

Markdown is the source format for narrative documentation. Do not convert the
project to reStructuredText: TypeScript tooling, GitHub, IDE previews, and the
existing repository all treat Markdown as the native format.

## What must be documented

Add a JSDoc comment to an exported function, type, class, hook, or component
when a caller needs to know any of the following:

- business meaning or invariants;
- authentication, authorization, persistence, or side effects;
- error and unavailable-state behavior;
- units, ranges, defaults, or non-obvious return values;
- accessibility, focus, portal, or keyboard behavior;
- a compatibility decision that a future refactor could accidentally remove.

Do not add comments that merely repeat a symbol name, parameter type, or obvious
implementation. Prefer executable tests for behavior and Markdown architecture
records for cross-cutting decisions.

## JSDoc style

- Start with one sentence that describes the contract.
- Add a short paragraph only when the reason or failure mode matters.
- Use `@param`, `@returns`, `@throws`, `@example`, or `@remarks` when they add
  information not already clear from TypeScript.
- Keep comments attached to the exported declaration so IDE hover text and
  TypeDoc see the same source.
- Never put secrets, live record values, or credentials in examples.

## Generated reference

The curated entry points are defined in `typedoc.json`.

```bash
npm run docs:check
npm run docs:api
```

`docs:check` validates that TypeDoc can understand the public contracts without
writing output. `docs:api` writes local HTML to `docs/_generated/api/`; generated
HTML is ignored because source comments and configuration are authoritative.

## Maintenance rule

A code change is incomplete when it changes a public contract, business rule,
theme responsibility, or operating procedure without updating the closest
source-level comment and the relevant Markdown source of truth.

