import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/*
 * View Transition 을 다시 들이지 못하게 막는다(#1080, #1085, #1128).
 *
 * Chromium 은 루트를 캡처하는 동안 sticky 위치를 스냅샷 영역 기준으로 다시 잡는다. 그 영역은 하단 툴바 아래까지 닿아,
 * 하단 툴바가 있는 브라우저(삼성 인터넷)에서 sticky 요소가 내려갔다가 돌아온다. DOM 값으로는 잡히지 않고 실기기 화면에만
 * 보여 나중에 알아채기 어렵다.
 *
 * 탭 밑줄을 CSS 로 옮기면서 `:root` 의 캡처 차단(`view-transition-name: none`)도 함께 지웠다. 그래서 전환을 한 곳이라도
 * 다시 쓰면 페이지 전체가 캡처되어 문제가 바로 돌아온다. 꼭 다시 써야 하면 `design-system/src/tabs.mdx` 의 체크리스트를
 * 확인하고 이 검사를 함께 고친다.
 */
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const SOURCE_DIRS = ["client/app", "client/components", "client/lib", "design-system/src"];
const SOURCE_FILE = /\.(css|ts|tsx)$/;
const NOT_PRODUCT_CODE = /\.(test|stories)\.tsx?$/;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sources = SOURCE_DIRS.flatMap((dir) => walk(join(REPO, dir)))
  .filter((path) => SOURCE_FILE.test(path) && !NOT_PRODUCT_CODE.test(path))
  .map((path) => ({ path: relative(REPO, path), text: readFileSync(path, "utf8") }));

const filesMatching = (pattern: RegExp) => sources.filter(({ text }) => pattern.test(text)).map(({ path }) => path);

describe("View Transition 가드", () => {
  it("React 의 ViewTransition 을 쓰지 않는다", () => {
    expect(filesMatching(/<ViewTransition\b|\bunstable_ViewTransition\b|\bViewTransition\b[^\n]*from "react"/)).toEqual(
      [],
    );
  });

  it("startViewTransition 을 직접 부르지 않는다", () => {
    expect(filesMatching(/\bstartViewTransition\b/)).toEqual([]);
  });

  it("CSS 나 인라인 스타일로 전환을 걸지 않는다", () => {
    expect(filesMatching(/view-transition-name|::view-transition|@view-transition/)).toEqual([]);
    expect(filesMatching(/\bviewTransitionName\b/)).toEqual([]);
  });

  it("Next 의 전환 설정을 켜지 않는다", () => {
    expect(readFileSync(join(REPO, "client/next.config.ts"), "utf8")).not.toMatch(/\bviewTransition\b/);
  });
});
