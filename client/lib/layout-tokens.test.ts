import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  CONTENT_MAX,
  FRAME_MAX,
  GUTTER,
  GUTTER_BREAKPOINT,
  GUTTER_NARROW,
  HOME_CARD_MAX,
  HOME_CARD_SIZES,
} from "./layout-tokens";

const require = createRequire(import.meta.url);
const systemCss = readFileSync(
  require.resolve("@poudy/design-system/theme.css").replace(/index\.css$/, "system.css"),
  "utf8",
);
const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tailwindTheme = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");

describe("layout-tokens", () => {
  it("상수가 디자인 시스템 CSS 의 거터와 같다", () => {
    expect(systemCss).toMatch(new RegExp(`:root \\{[^}]*--gutter: ${GUTTER_NARROW}px;`));
    expect(systemCss).toMatch(
      new RegExp(`@media \\(min-width: ${GUTTER_BREAKPOINT}px\\) \\{\\s*:root \\{\\s*--gutter: ${GUTTER}px;`),
    );
  });

  it("본문 최대 폭이 inset-x-content 의 계산식과 같다", () => {
    expect(systemCss).toContain(`calc((100vw - ${CONTENT_MAX}px) / 2 + var(--gutter))`);
  });

  it("본문 최대 폭이 body 의 --container-md 와 같다", () => {
    expect(globalsCss).toMatch(/body \{[^}]*max-width: var\(--container-md\);/);
    expect(tailwindTheme).toContain(`--container-md: ${FRAME_MAX / 16}rem;`);
  });

  it("홈 제품 카드의 sizes 는 3열 격자에서 그려지는 실제 폭이다", () => {
    expect(HOME_CARD_MAX).toBe(132);
    expect(HOME_CARD_SIZES).toBe("(min-width: 448px) 132px, calc((100vw - 52px) / 3)");
  });
});
