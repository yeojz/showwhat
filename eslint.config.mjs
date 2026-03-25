import tseslint from "typescript-eslint";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
  },
  {
    ignores: ["**/dist/", "**/node_modules/", "**/*.config.*", "**/*.mjs"],
  },
);
