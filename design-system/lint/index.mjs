/**
 * 디자인 토큰 린트. 규칙과 예외는 이 패키지가 정하고, client 의 eslint.config.mjs 가 가져와 덧붙인다.
 *
 *   import { designSystemLint } from "@poudy/design-system/lint";
 *   export default defineConfig([...다른 설정, ...designSystemLint({ files, ignores })]);
 *
 * 처음에는 모든 규칙을 경고로 켠다. 경고는 CI 를 실패시키지 않으므로 기존 코드는 그대로 두고,
 * 새로 생기는 위반을 리뷰에서 본다. 정리를 마친 경로부터 오류로 올린다(#743).
 */
import { readFileSync } from "node:fs";

import { plugin as shadcn } from "@shadcn/lint";

import { exceptions } from "./exceptions.mjs";

export { exceptions };

/** 켜는 규칙. 모두 경고로 시작한다. */
export const RULES = [
  "no-arbitrary-values",
  "no-raw-colors",
  "no-inline-styles",
  "no-unknown-classes",
  "require-static-classes",
  "no-restyle",
];

/** 디자인 시스템 부품으로 알아볼 import. no-restyle 과 require-static-classes 가 이 부품을 쓰는 곳을 본다. */
const COMPONENT_IMPORTS = [
  "^@poudy/design-system/(button|icon-button|text-field|text-area|select|search-field|combobox|radio-group|checkbox-group|range-slider|slider|filter-chip|toggle-chip|tag|badge|tabs|tab-nav|disclosure|bottom-sheet|confirm-sheet|skeleton|toast|notice)$",
];

/**
 * 부품으로 보지 않을 import. 린트는 shadcn/ui 관례대로 @/components/ui 를 부품 폴더로 짐작하는데, client 의 그 폴더는
 * 디자인 시스템 부품이 아니라 화면 쪽 컴포넌트다. 화면을 옮기며 패키지 부품으로 바꾼다. 패키지 부품은 늘 패키지 이름으로
 * 가져오므로 상대 경로 import 도 부품으로 보지 않는다.
 */
const IGNORED_IMPORTS = ["^@/components/", "^\\.{1,2}/"];

/**
 * 글자 크기 토큰 이름. Tailwind 의 text-* 는 색과 크기를 함께 쓰는 이름이라, no-raw-colors 가
 * text-body 같은 크기 토큰을 '선언되지 않은 색'으로 잘못 본다. 토큰 CSS 에서 크기 이름을 읽어 허용한다.
 */
const textSizeClasses = () => {
  const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");
  return [...css.matchAll(/^\s*--text-([a-z0-9-]+):/gm)]
    .map(([, name]) => name)
    .filter((name) => !name.includes("--"))
    .map((name) => `text-${name}`);
};

/**
 * 패키지가 @utility 로 등록한 클래스(pressable, fb-*, press-scale, px-gutter …). 패키지만 검사할 때는
 * Tailwind 를 가져오는 스타일시트가 없어 린트가 이 이름을 모르므로, CSS 에서 이름을 읽어 허용한다.
 */
const utilityClasses = () =>
  ["../src/system.css", "../src/interaction.css"].flatMap((file) => {
    const css = readFileSync(new URL(file, import.meta.url), "utf8");
    return [...css.matchAll(/@utility\s+([a-z0-9-]+)/g)].map(([, name]) => name);
  });

const allowFor = (rule) => exceptions.flatMap((exception) => exception.allow?.[rule] ?? []);

const NOTE =
  "명세(client/design/poudy-ui.pen)의 토큰과 스케일만 쓴다. 토큰 이름은 design-system/README.md, " +
  "허용된 예외는 design-system/lint/exceptions.mjs 에 있다. 잠시 필요한 예외는 그 줄에 " +
  "'eslint-disable-next-line 규칙 -- design-exception: 이유 · 만료 YYYY-MM-DD' 를 단다.";

/**
 * @param {{ files: string[]; ignores?: string[] }} options
 * @returns {import("eslint").Linter.Config[]}
 */
export function designSystemLint({ files, ignores = [] }) {
  return [
    {
      name: "poudy/design-system",
      files,
      ignores,
      plugins: { shadcn },
      settings: { shadcn: { note: NOTE, componentImports: COMPONENT_IMPORTS, ignoreImports: IGNORED_IMPORTS } },
      rules: {
        "shadcn/no-arbitrary-values": ["warn", { allow: allowFor("no-arbitrary-values") }],
        "shadcn/no-raw-colors": ["warn", { allow: [...textSizeClasses(), ...allowFor("no-raw-colors")] }],
        "shadcn/no-inline-styles": "warn",
        "shadcn/no-unknown-classes": ["warn", { allow: utilityClasses() }],
        "shadcn/require-static-classes": "warn",
        // 부품의 모양은 부품이 정한다. 쓰는 쪽은 자리(여백·폭·배치)만 바꾼다.
        "shadcn/no-restyle": [
          "warn",
          {
            allow: ["layout"],
            message:
              "{{component}} 의 모양은 부품이 정한다. 변형(variant·size)을 쓰고, className 으로는 자리(여백·폭·배치)만 바꾼다.",
          },
        ],
      },
    },
  ];
}
