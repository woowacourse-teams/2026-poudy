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

/** 지금 켜는 규칙. require-static-classes 와 no-restyle 은 cn·cva 를 들인 뒤에 켠다(#725). */
export const RULES = ["no-arbitrary-values", "no-raw-colors", "no-inline-styles", "no-unknown-classes"];

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
      settings: { shadcn: { note: NOTE } },
      rules: {
        "shadcn/no-arbitrary-values": ["warn", { allow: allowFor("no-arbitrary-values") }],
        "shadcn/no-raw-colors": ["warn", { allow: [...textSizeClasses(), ...allowFor("no-raw-colors")] }],
        "shadcn/no-inline-styles": "warn",
        "shadcn/no-unknown-classes": "warn",
      },
    },
  ];
}
