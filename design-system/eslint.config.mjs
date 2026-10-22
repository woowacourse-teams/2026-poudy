import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import { defineConfig } from "eslint/config";

import { designSystemLint } from "./lint/index.mjs";

const sourceFiles = ["src/**/*.{ts,tsx}", ".storybook/**/*.{ts,tsx}"];
// 토큰 문서는 토큰을 이름으로 골라 칠해 보여 주려고 style 로 var(--…) 를 넘긴다. 그래서 디자인 토큰 린트는 걸지 않는다.
const docFiles = ["docs/**/*.{ts,tsx}"];

// 패키지의 부품도 client 와 같은 디자인 토큰 린트로 검사한다.
export default defineConfig([
  {
    files: [...sourceFiles, ...docFiles],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  ...designSystemLint({ files: sourceFiles, ignores: ["src/**/*.test.{ts,tsx}"] }),
  ...storybook.configs["flat/recommended"],
]);
