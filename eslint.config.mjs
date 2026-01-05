import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Scripts that need CommonJS require()
      "scripts/**/*.cjs",
      "scripts/**/*.js",
      // Jest config files (CommonJS)
      "jest.*.cjs",
      // Legacy type declarations
      "types/web-speech.d.ts",
      // Test mocks and fixtures
      "__mocks__/**",
    ],
  },
  // Global rule adjustments for incremental improvement
  {
    rules: {
      // Downgrade to warnings - fix incrementally, don't block builds
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Unescaped entities - common in JSX, fix incrementally
      "react/no-unescaped-entities": "warn",
    },
  },
  // Allow require() in config files, certain lib files, and tests
  {
    files: [
      "**/*.config.ts",
      "**/*.config.js",
      "sentry.*.ts",
      "lib/logger.ts",
      "lib/email.ts",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Turn off link check for API routes (they don't render HTML)
  {
    files: ["app/api/**/*.ts"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
