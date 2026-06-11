import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      // BEACON ingests many hostile/loosely typed third-party OSINT feeds.
      // Requiring perfect types at every API boundary creates lint theater,
      // not safer code. Keep TypeScript validation on; allow explicit edge types.
      "@typescript-eslint/no-explicit-any": "off",

      // This fork still contains imported dashboard/feed code with unused imports
      // and callback placeholders. TypeScript/build remain authoritative while the
      // app is stabilized; dead-code cleanup can happen file-by-file later.
      "@typescript-eslint/no-unused-vars": "off",

      // MapLibre, portals, and browser-only panels use imperative client patterns
      // that React Compiler lint currently flags noisily. These are not build or
      // type errors, and refactoring them all is a separate UI modernization pass.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/exhaustive-deps": "off",

      // Remote CCTV / OSINT thumbnail URLs are not all known at build time.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      // Small Node sidecars/scripts are CommonJS until converted deliberately.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
