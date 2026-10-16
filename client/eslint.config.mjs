import js from "@eslint/js";
import { designSystemLint, RULES as DESIGN_SYSTEM_RULES } from "@poudy/design-system/lint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import functional from "eslint-plugin-functional";
import globals from "globals";

const projectFiles = ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"];
const testFiles = ["**/*.test.ts", "**/*.test.tsx"];
// 테스트는 검증 대상이 아니라 검증하는 쪽이다. expect 호출 자체가 표현식 문이라
// 함수형 규칙을 그대로 적용할 수 없다.
const domainFiles = ["lib/domain/**/*.ts"];
// 관리자 화면은 명세에서 admin- 체계로 따로 정해 두어 디자인 토큰 린트의 대상이 아니다.
const adminFiles = ["app/admin/**", "components/admin/**"];
// 처음부터 토큰만 써서 새로 만든 화면. 경고 단계를 거치지 않고 디자인 토큰 린트를 오류로 켠다(#722 2단계 개편 구현).
const tokenStrictFiles = [
  "app/shelf/**/*.{ts,tsx}",
  "components/shelf/**/*.{ts,tsx}",
  "app/my-page/**/*.{ts,tsx}",
  "components/my-page/**/*.{ts,tsx}",
  "components/saved/**/*.{ts,tsx}",
  "components/login/WithdrawnNotice.tsx",
  "components/login/RegisteredAccountNotice.tsx",
  "components/skin-filter/**/*.{ts,tsx}",
];

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
  {
    files: testFiles,
    rules: {
      "functional/no-let": "off",
      "functional/immutable-data": "off",
      "functional/no-expression-statements": "off",
      "no-ternary": "off",
      "max-lines-per-function": "off",
    },
  },
  // 디자인 토큰 린트. 규칙과 명세 예외는 디자인 시스템 패키지가 정한다(design-system/lint).
  ...designSystemLint({ files: projectFiles, ignores: [...testFiles, ...adminFiles] }),
  {
    files: tokenStrictFiles,
    ignores: testFiles,
    // 심각도만 바꾸므로 규칙의 옵션(허용 목록 등)은 디자인 시스템 린트가 정한 그대로 남는다.
    rules: Object.fromEntries(DESIGN_SYSTEM_RULES.map((rule) => [`shadcn/${rule}`, "error"])),
  },
  eslintConfigPrettier,
  // Override the default ignores from eslint-config-next.
  // mockServiceWorker.js 는 msw 가 생성하는 파일이라 직접 고치지 않는다.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/mockServiceWorker.js"]),
]);

export default eslintConfig;
