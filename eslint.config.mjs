import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Project-level rule overrides
  {
    rules: {
      // Downgraded to warn — will be properly typed as each page is transformed
      '@typescript-eslint/no-explicit-any': 'warn',
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
