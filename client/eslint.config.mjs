import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import functional from "eslint-plugin-functional";
import globals from "globals";

const projectFiles = ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"];
const domainFiles = ["lib/domain/**/*.ts"];

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  {
    files: projectFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "max-depth": ["error", 3],
      "max-params": ["error", 3],
      "no-param-reassign": "error",
      "import/no-unresolved": "error",
      "import/order": [
        "error",
        {
          alphabetize: {
            caseInsensitive: true,
            order: "asc",
          },
          "newlines-between": "always",
        },
      ],
    },
  },
  {
    files: ["lib/**/*.ts"],
    rules: {
      "max-lines-per-function": [
        "error",
        {
          max: 30,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: domainFiles,
    plugins: {
      functional,
    },
    rules: {
      "functional/no-let": "error",
      "functional/immutable-data": "error",
      "functional/no-expression-statements": "error",
      "no-ternary": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/components/*", "next", "next/*", "react", "react/*"],
              message: "domain 계층에서는 App Router, UI, Next.js, React 런타임을 import하지 마세요.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
  // Override the default ignores from eslint-config-next.
  // mockServiceWorker.js 는 msw 가 생성하는 파일이라 직접 고치지 않는다.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/mockServiceWorker.js"]),
]);

export default eslintConfig;
