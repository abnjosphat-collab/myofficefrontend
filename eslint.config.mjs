import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next/core-web-vitals only turns on 6 jsx-a11y rules (alt-text,
// aria-props/proptypes/unsupported-elements, role-has-required-aria-props, and one
// more) — a small curated subset, not the full recommended set (34 rules: things like
// label-has-associated-control, click-events-have-key-events, anchor-is-valid,
// interactive-supports-focus are NOT covered by Next's subset). This app's actual
// interactive-component-level a11y work (CenterModal focus trap, Combobox/
// PredictiveInput ARIA roles, DownloadButton ARIA menu, PillTabs/UnderlineTabs ARIA
// tabs) is already shipped — this closes the remaining real gap, which was lint
// *coverage*, not missing component behavior. All forced to 'warn' (never 'error') so
// this is a visibility/backlog tool, not a new CI gate — the app hasn't been audited
// against the full rule set yet, so some of these may fire broadly on day one.
const a11yRecommended = jsxA11y.flatConfigs.recommended;
const a11yWarnRules = Object.fromEntries(
  Object.keys(a11yRecommended.rules).map((rule) => [rule, "warn"])
);
// label-has-for is deprecated upstream in favor of label-has-associated-control (which
// stays enabled above and already covers the real requirement: a label needs a matching
// htmlFor/id OR to nest its control). label-has-for's default `required` option demands
// BOTH nesting AND id — unsatisfiable for a generic wrapper component (e.g. FormField in
// components/shared/design-system/components.tsx) whose control is passed in as an opaque
// `children` prop, since such a component can never author a literal nested <input>/
// <select>/<textarea> tag even when its actual (correct, htmlFor/id-associated) label is
// fine. Turned off rather than satisfied per-callsite with a fake nested element.
a11yWarnRules["jsx-a11y/label-has-for"] = "off";

// A single className chunk with two unmodified bg-* color utilities silently lets one
// win with no warning — found and fixed 3 separate times in this codebase already. A
// plain no-restricted-syntax regex selector can't reliably express the needed
// lookaround in esquery's selector grammar (tried; esquery's regex-in-selector parser
// rejected it), so this is a small real rule using a real JS RegExp instead.
//
// Deliberately checked PER literal/template chunk, not merged across a whole
// className expression: a ternary's branches are mutually exclusive at runtime (e.g.
// STATUS_HEX-style "pick one of these colors"), so treating "bg-a" in one branch and
// "bg-b" in another as if they applied simultaneously would be wrong — they never
// co-occur. The real bug shape is two bg-* utilities that DO co-occur: either
// hardcoded together in one string, or one hardcoded outside a ternary alongside
// another hardcoded value in the same chunk.
const BG_COLOR_RE = /(?<!:)\bbg-([\w./%[\]#-]+)/g;
const BG_STRUCTURAL_RE = /^(gradient-|clip-|opacity-|blend-|none\b|repeat\b|fixed\b|local\b|scroll\b|contain\b|cover\b|center\b|auto\b)/;

function bgUtilitiesIn(str) {
  const found = [];
  BG_COLOR_RE.lastIndex = 0;
  let m;
  while ((m = BG_COLOR_RE.exec(str))) {
    if (!BG_STRUCTURAL_RE.test(m[1])) found.push(m[0]);
  }
  return found;
}

function isClassNameAttrValue(node) {
  let p = node.parent;
  while (p) {
    if (p.type === "JSXAttribute") return !!(p.name && p.name.name === "className");
    p = p.parent;
  }
  return false;
}

const localRules = {
  rules: {
    "no-bg-class-collision": {
      meta: { type: "suggestion", schema: [] },
      create(context) {
        function check(node, str) {
          const found = bgUtilitiesIn(str);
          if (found.length >= 2) {
            context.report({
              node,
              message: `Two bg-* color utilities in one className chunk (${found.join(", ")}) — one silently wins with no warning (found 3x before). If both are meant to apply (hover:/dark:/etc.), prefix them; otherwise this is likely the class-stacking bug.`,
            });
          }
        }
        return {
          Literal(node) {
            if (typeof node.value === "string" && isClassNameAttrValue(node)) check(node, node.value);
          },
          TemplateElement(node) {
            if (isClassNameAttrValue(node)) check(node, node.value.raw);
          },
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Just the rules, not the whole flat-config object — eslint-config-next/core-web-vitals
  // already registers its own "jsx-a11y" plugin instance; re-spreading
  // a11yRecommended's `plugins` key here throws ("Cannot redefine plugin jsx-a11y").
  { rules: a11yWarnRules },
  // Project-level rule overrides
  {
    rules: {
      // Downgraded to warn — will be properly typed as each page is transformed
      '@typescript-eslint/no-explicit-any': 'warn',
      // Re-triaged 2026-08-31: 34 findings across 25 files, read individually rather than
      // bulk-suppressed. 33 were legitimate, structurally-necessary effect patterns —
      // fetch-on-mount/on-dependency-change (the majority), SSR-safe hydration from
      // localStorage/matchMedia (can't read those during render without a hydration
      // mismatch), subscribe-to-external-system (timers, storage/custom DOM events),
      // portaled-dropdown mount flags (createPortal needs `document`, unavailable during
      // SSR), and "reset local editable state when a modal opens for a different record"
      // — a low-frequency, well-understood pattern already reasoned about explicitly once
      // in this codebase (see the comment above the `highlight` effect in
      // components/shared/EmployeeNameInput.tsx, which already separated a genuinely
      // *derived* value — computed via useMemo — from this one, which isn't). Only one
      // finding was a real, free fix (app/leave-management/page.tsx's sample-data seed
      // effect, replaced with a plain useState initializer since the data was already a
      // static module-level constant). Left at 'error' this would keep punishing the
      // correct pattern far more often than it catches the derived-state anti-pattern
      // it exists for — downgraded to 'warn' for the same reason the jsx-a11y rules above
      // are 'warn': a visibility/backlog signal for genuinely new derived-state mistakes,
      // not a CI gate on an already-necessary pattern.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  // Design-token drift: raw Tailwind text-size utilities bypass TYPE_SCALE
  // (components/shared/design-system/tokens.tsx), which is how the app is supposed to
  // stay visually consistent and theme-aware. This doesn't retroactively fix the many
  // existing call sites — set to 'warn' so CI doesn't go red on day one — it just stops
  // new drift from being introduced silently. Migrate call sites to TYPE_SCALE
  // opportunistically, e.g. when a page is touched for other work.
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["components/ui/**"], // shadcn primitives own their own sizing contract
    plugins: { local: localRules },
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-(xs|sm)\\b/]",
          message: "Raw text-xs/text-sm bypasses TYPE_SCALE (components/shared/design-system/tokens.tsx) — prefer a TYPE_SCALE token so size stays consistent and theme-aware.",
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\btext-(xs|sm)\\b/]",
          message: "Raw text-xs/text-sm bypasses TYPE_SCALE (components/shared/design-system/tokens.tsx) — prefer a TYPE_SCALE token so size stays consistent and theme-aware.",
        },
      ],
      "local/no-bg-class-collision": "warn",
      // Page-size guardrail. Every payroll bug this project has found has lived in
      // untested inline logic with nowhere to put a test (see the calcX.ts convention
      // in frontend/docs/ENGINEERING_STANDARDS.md) — a page that keeps absorbing more
      // state/handlers/view-branches instead of extracting them is exactly where that
      // pattern recurs. 600 lines was picked from this codebase's own distribution
      // (median 79, p90 601, p95 989 across app/**+components/**) — it's the same line
      // as "already in the top ~10%, worth a second look", not an arbitrary house
      // number. 'warn' only: 36 files are already over this line and aren't being
      // retroactively split in this pass — this stops new pages from silently growing
      // into the same shape, and nudges a split (extract a calcX.ts, a sub-view
      // component, a tab into its own file) the next time a flagged file is touched
      // for other work, same as the TYPE_SCALE rule above.
      "max-lines": ["warn", { max: 600, skipBlankLines: true, skipComments: true }],
    },
  },
  // The MFA sign-in bypass and the admin/callback sign-in bypass were two independent
  // incidents sharing one root cause: reading auth state from a raw Supabase call
  // instead of the app's single explicit funnel let a background process (the SDK's
  // auto session-detection, or the global onAuthStateChange listener) flip "signed in"
  // before app-specific logic (the MFA challenge check / invite-vs-recovery routing)
  // had run. Both were fixed locally in their own file, with no shared guard against a
  // third occurrence — this is that guard. lib/auth-context.tsx and lib/supabase.ts/
  // app/auth/callback/page.tsx are the two sanctioned funnels; nothing else should call
  // these directly.
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "lib/auth-context.tsx", "lib/supabase.ts", "app/auth/callback/page.tsx",
      // lib/api.ts's authFetch() calls getSession() too, but for a different, safe
      // reason: grabbing the current token to attach to one outgoing request's
      // Authorization header, not reading auth state to make a UI/routing decision.
      // There's nothing here that can race against onAuthStateChange the way the two
      // real incidents did — found by this very rule while wiring it up, and confirmed
      // safe on inspection rather than silently ignored.
      "lib/api.ts",
      ".next/**", "node_modules/**", "coverage/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.property.name='getSession']",
          message: "supabase.auth.getSession() outside the sanctioned auth funnels (lib/auth-context.tsx, lib/supabase.ts, app/auth/callback/page.tsx) risks reintroducing the auth race-condition bug class (MFA bypass, callback bypass — see frontend/docs/ENGINEERING_STANDARDS.md) — read session state from useAuth() instead.",
        },
        {
          selector: "CallExpression[callee.property.name='onAuthStateChange']",
          message: "supabase.auth.onAuthStateChange() outside lib/auth-context.tsx (the single sanctioned subscriber) risks reintroducing the auth race-condition bug class (see frontend/docs/ENGINEERING_STANDARDS.md) — subscribe via useAuth() instead.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
