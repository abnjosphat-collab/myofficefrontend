# Muse Code prompt: Tools precision polish

Paste the following prompt into Muse Code with the workspace open at
`C:\Users\Administrator\Documents\studio\myoffice`.

## Evidence and limits of this review

Inspected on 2 October 2026. Frontend HEAD is `97c93bb` (Merge MuseOffice
standalone work back into /tools), main is one commit ahead of origin/main.
There are existing dirty changes in ToolsAuth.tsx, page.tsx, toolsApi.ts,
toolsApi.test.ts and the Muse handoff/documentation files. Reinspect before edits.

The local page at http://localhost:3000/tools renders the required sign-in
dialog in this agent's browser. No signed-in session was available there;
populated homepage, pointer-hover and dropdown defects were reported by the
user and were not independently reproduced in a signed-in browser this review.
The code findings below are confirmed; suspected visual causes need rendered
verification before being called fixed.

## Paste-ready implementation prompt

```text
Continue the current /tools UI. Audit, plan and implement the small visual and
interaction corrections below to a production-quality finish. This is the
Tools pilot for a future consistent MyOffice design system. Restrict runtime
changes to frontend/app/tools for now. Preserve the current business logic,
access rules, authentication work, Supabase persistence and all existing edits.

READ AND INSPECT FIRST
Read frontend/AGENTS.md, applicable nested instructions, the local framework
docs required by those instructions, docs/PRODUCT.md,
docs/ENGINEERING_PRINCIPLES.md, frontend/docs/ENGINEERING_STANDARDS.md,
frontend/docs/TOOLS_SYSTEM_SPECIFICATION.md,
frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md,
frontend/docs/MUSE_HANDOFF_2026-10-01.md and this brief.
Inspect frontend and backend git status, diffs and current logs. Older handoff
checkpoint hashes may be stale. Do not reset, stash, overwrite existing edits,
commit, push, deploy, run migrations or change live business data.

Before implementation, inspect the actual signed-in page and relevant source.
Capture representative before screenshots. Write a short issue list and a
component/state plan, then implement it. Source files of particular relevance:
- app/tools/page.tsx: sidebar, section selection, header and homepage props.
- app/tools/ToolsIcon.tsx: existing Phosphor semantic icon map.
- app/tools/tools.module.css: theme tokens, layered sidebar and dropdown rules.
- app/tools/ToolsHomepage.tsx and ToolsHomepage.test.tsx.
- app/tools/AnimatedSelect.tsx and AnimatedSelect.test.tsx.
- app/tools/sidebarNav.ts and sidebarNav.test.ts.
- app/tools/ToolsProfileMenu.tsx and ToolsWorkspaceSearch.tsx.

1. SIDEBAR GEOMETRY AND ICONS
The user sees icons off-centre inside their pill/bordered area, especially on
hover. Confirm expanded, collapsed and mobile layouts.
Source currently has translateX(2px) on nav hover, a 22px navIcon cell with an
18px light icon, and a separate 30px spotlight cell with a 19px fill icon.
Nested span and breakpoint rules can change icon visibility and alignment.

Use one reusable sidebar item/icon-cell implementation. Give all section icons
consistent SVG size, cell geometry, alignment, padding and visual weight.
Remove hover translation and scaling so the glyph centre and hit target stay
fixed. Inspect optical alignment of each silhouette as well as box centres.
Use explicit icon/label classes: mobile label hiding must never hide the icon
wrapper. Avoid brittle nth-child rules and arbitrary per-icon offsets.
Keep tooltips usable and focus visible; do not clip them to fix geometry.

The app already uses @phosphor-icons/react. Start by comparing its regular,
duotone and fill weights at the real sidebar size. Prefer consistent duotone
green glyphs across ALL section icons, with a stronger selected treatment.
If fill is visibly better across the complete set, use it consistently there.
Do not use CSS fill on outline paths to simulate designed filled icons.
Do not replace the icon library merely to mask spacing/weight errors. If an
alternative is proposed, compare every actual nav glyph, accessibility,
bundle/dependency cost and licensing before adding it. No new dependency is
expected for this change. Keep equipment tile icons removed.

Green glyph colour should read as navigation branding, not success status.
All items can use that accent; only the selected item gets the stronger active
background plus a clear non-colour cue and aria-current="page".
The current section is promoted to the spotlight and the remaining list is
ranked by sidebarNav: preserve that behaviour unless a measured usability
issue justifies changing it. Verify no duplicate active item or stale label.
Give the spotlight the same alignment discipline as the other items.

2. CONTAINED HOVER AND DROPDOWN STATES
The user reports a green highlight protruding outside borders while moving
down menus; hovering the closed trigger looks correct. Reproduce both states.
Distinguish intended keyboard focus outline from leaking pointer-hover fill.

AnimatedSelect portals its menu to document.body and copies selected theme
variables. Selectors scoped under .surface therefore do not match that menu,
and .surface button resets/focus rules do not automatically apply to options.
Inspect computed styles of portal and non-portal controls: box-sizing,
appearance, width, padding, margin, borders, inherited font, hover shadow,
radius and scroll clipping. The partial token transfer also needs review.
Confirm the actual cause before applying a repair; portal use alone is not
proof of overflow.

Make option rows border-box and fit inside the menu's padded content box.
Keep selected/hover fills within the rounded row and menu outline. Use an
inset treatment or restrained background rather than an external hover ring.
Preserve visible keyboard focus and selected checkmark, and do not conceal
overflow by clipping interactive content or focus indicators blindly.
Give portal menus the same explicit scoped Tools reset, typography and token
contract as their triggers, without changing global body/MyOffice styles.

Verify department, filters, sort, form selectors and other Tools menus. Check
first/last row, long labels, scrolling, upward placement, viewport edges,
pointer entry/exit, Arrow keys/Home/End/Enter/Escape/Tab, outside-click closing,
focus return and reduced motion. Preserve one-open-popover coordination.
Keep menus anchored to their trigger and contained in the viewport at 390px.

3. HOMEPAGE COMPOSITION AND COPY
Current header stacks:
"Homepage"
"Your equipment operation in one place — custody, compliance and movements,
live from the register."
"Showing Mine Technical Services · Signed in as Mickey Mouse (Issuer)"
It mixes orientation, explanatory marketing copy, scope, identity and role.

Use a compact page heading such as "Overview" and a short optional operational
subtitle. Keep department scope near the department selector or in a concise
labelled scope row; identity/role belong primarily in the account control.
Avoid repeating all this in a long sentence. Preserve accessible account and
scope information. Replace the concatenated contextLine with structured props
if that is the simplest maintainable way to render it.

Recommended hierarchy:
- Compact heading and useful scope context.
- Live metrics in an aligned row/grid with stable number/label baselines.
- Needs attention and Recent movements before the full section navigation.
- A compact, clearly labelled workspace-shortcuts area afterwards, so users
  see current operations before a second directory repeating the sidebar.
Retain section discoverability and every role-permitted shortcut.

Use a deliberate spacing scale, aligned card edges and a clear type hierarchy.
Allow names, departments and record details to wrap gracefully. Avoid large
decorative hero blocks and gratuitous gradients. Check populated, empty,
loading, partial failure and long-content states. Do not turn unavailable
metrics into zero or claim "Everything is clear" when the required attention
sources are unavailable. Review homePending/homeAttention data guards before
changing any empty-state wording.

4. COLOUR AND COMPONENT CONSISTENCY
Retain the single near-white/mineral-green Tools theme. Current source tokens:
canvas #f4f6f5, paper #fbfcfb, ink #1b2923, brand #233b31,
brand-soft #e0ebe5, focus #4f806a, radius 7px.
Assess these at actual UI size; keep accent restrained and surfaces calm.
Use named tokens for navigation icon, active item, hover, border and focus
where useful. Preserve semantic warning/danger/success and colourful charts.
Check WCAG AA text and required non-text contrast using actual computed
colours. Do not treat a faint decorative halo as the only focus indicator.

CSS currently contains multiple historical override layers and hardcoded
12/16/18px radii in newer homepage/sidebar rules. Consolidate the affected
sidebar, menu and homepage rules into clear component-owned blocks, preserving
unrelated styles and verified behaviours. Use the shared Tools radius tokens
consistently; retain any intentional larger navigation container radius only
with a documented visual rationale. No endless final-override patch pile.

REUSE AND FUTURE MYOFFICE ADOPTION
Build with React composition, shared props, semantic icon mapping and CSS
custom-property inheritance. Do not introduce class inheritance for React UI.
Keep the reusable pieces local to Tools until this pilot is visually accepted.
Document their state contracts and how they could later map to MyOffice's
shared design system. Do not propagate the new design to other routes yet.

VERIFICATION AND DELIVERY
Run appropriate existing focused tests for changed interaction/data contracts,
focused ESLint, npx tsc --noEmit, npm run build, and git diff --check.
Inspect scripts/verify.mjs and relevant browser tests for pinned behaviours;
do not weaken assertions to make a changed design pass. A hung test is an
unresolved check, never a pass. Avoid unnecessary new tests for static CSS.

Perform rendered signed-in desktop and 390px verification using representative
existing data without writing business records. Check expanded/collapsed
sidebar, every nav icon at rest/hover/focus, mobile icon visibility, homepage
hierarchy, dropdown rows and viewport containment, and console errors.
Allow Supabase free-tier wake-up time and preserve truthful loading/retry.
Save before/after screenshots and report precise findings. If the browser is
signed out, use the user's normal authorised sign-in flow; never copy a token
between browser profiles or bypass authentication. Request only truly missing
credentials, then continue independent checks while waiting.

Update frontend/docs/DALLAGLIO_AUDIT_2026-09-26.md with what actually passed and
what remains open. Update the relevant Muse handoff to reflect current work.
Report changed files, chosen icon weight/tokens, visual evidence, check results
and any remaining defect. Do not claim "ultra polished" from source/build
alone. Complete the requested Tools corrections before suggesting expansion.
```

## Primary references

- [Phosphor React: weights and API](https://github.com/phosphor-icons/react)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C focus appearance guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)

Focus Appearance 2.4.13 is AAA; this prompt's AA requirements include visible
keyboard focus, required non-text contrast and focus not being obscured.
