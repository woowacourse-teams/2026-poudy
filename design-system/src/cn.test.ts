import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { cn, TEXT_SIZES } from "./cn";

const tokensCss = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("cn", () => {
  it("글자 크기 목록이 토큰 CSS 의 --text-* 와 같다", () => {
    const fromTokens = [...tokensCss.matchAll(/^\s*--text-([a-z0-9-]+):/gm)]
      .map(([, name]) => name)
      .filter((name) => !name.includes("--"));
    expect([...TEXT_SIZES].sort()).toEqual(fromTokens.sort());
  });

  it("글자 크기와 글자색을 서로 다른 속성으로 본다", () => {
    expect(cn("text-14 text-text-primary")).toBe("text-14 text-text-primary");
    expect(cn("text-body", "text-action-text")).toBe("text-body text-action-text");
    expect(cn("text-admin-body", "text-admin-text")).toBe("text-admin-body text-admin-text");
  });

  it("같은 속성이 겹치면 뒤의 것을 남긴다", () => {
    expect(cn("text-14", "text-16")).toBe("text-16");
    expect(cn("rounded-xl", "rounded-none")).toBe("rounded-none");
    expect(cn("shadow-raised", "shadow-sheet")).toBe("shadow-sheet");
  });

  it("글자를 따라 커지는 size-em 을 다른 크기와 겹치는 것으로 본다", () => {
    expect(cn("[&>svg]:size-6", "[&>svg]:size-em")).toBe("[&>svg]:size-em");
  });

  it("조건에 따라 클래스를 붙인다", () => {
    expect(cn("px-4", false && "py-2", { "w-full": true })).toBe("px-4 w-full");
  });
});
