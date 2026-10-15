import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

import { designSystemLint } from "./lint/index.mjs";

const sourceFiles = ["src/**/*.{ts,tsx}"];

// 패키지의 부품도 client 와 같은 디자인 토큰 린트로 검사한다.
export default defineConfig([
  {
    files: sourceFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  ...designSystemLint({ files: sourceFiles, ignores: ["src/**/*.test.{ts,tsx}"] }),
]);
