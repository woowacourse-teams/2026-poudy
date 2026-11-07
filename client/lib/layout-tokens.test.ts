import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  CONTENT_MAX,
  FRAME_FULL_SIZES,
  GUTTER,
  GUTTER_BREAKPOINT,
  GUTTER_NARROW,
  GUTTERED_FULL_SIZES,
  HOME_CARD_MAX,
  HOME_CARD_SIZES,
} from "./layout-tokens";

const require = createRequire(import.meta.url);
const systemCss = readFileSync(
  require.resolve("@poudy/design-system/theme.css").replace(/index\.css$/, "system.css"),
  "utf8",
);
const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("layout-tokens", () => {
  it("상수가 디자인 시스템 CSS 의 거터와 같다", () => {
    expect(systemCss).toMatch(new RegExp(`:root \\{[^}]*--gutter: ${GUTTER_NARROW}px;`));
    expect(systemCss).toMatch(
      new RegExp(`@media \\(min-width: ${GUTTER_BREAKPOINT}px\\) \\{\\s*:root \\{\\s*--gutter: ${GUTTER}px;`),
    );
  });

  it("본문 최대 폭이 디자인 시스템 CSS 의 --content-max 와 같다", () => {
    expect(systemCss).toContain(`--content-max: ${CONTENT_MAX / 16}rem;`);
  });

  it("앱 틀(body)은 --content-max 로 폭을 묶는다", () => {
    expect(globalsCss).toMatch(/body \{[^}]*max-width: var\(--content-max\);/);
  });

  it("홈 제품 카드의 sizes 는 2열·3열 격자에서 그려지는 사진(칸 폭의 70%)의 실제 폭이다", () => {
    expect(HOME_CARD_MAX).toBe(94);
    expect(HOME_CARD_SIZES).toBe(
      "(max-width: 359px) calc((100vw - 32px) * 0.7 / 2), (min-width: 448px) 94px, calc((100vw - 48px) * 0.7 / 3)",
    );
  });

  it("거터 안쪽 그림의 sizes 는 그려지는 실제 폭이다", () => {
    expect(GUTTERED_FULL_SIZES).toBe(
      "(max-width: 359px) calc(100vw - 24px), (min-width: 448px) 416px, calc(100vw - 32px)",
    );
    expect(FRAME_FULL_SIZES).toBe("(min-width: 448px) 448px, 100vw");
  });
});
