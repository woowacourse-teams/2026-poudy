import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import { CONTENT_MAX, GUTTER, GUTTER_BREAKPOINT, GUTTER_NARROW } from "./layout-tokens";

const require = createRequire(import.meta.url);
const systemCss = readFileSync(
  require.resolve("@poudy/design-system/theme.css").replace(/index\.css$/, "system.css"),
  "utf8",
);

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
});
