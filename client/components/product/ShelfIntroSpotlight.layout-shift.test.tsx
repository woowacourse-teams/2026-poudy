import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/*
 * 파우치 소개가 CLS 를 올리지 못하게 막는다. 비춤 구멍은 화면을 덮는 그림자를 달고 있어, top · left 로 움직이면
 * 프레임마다 화면 전체가 밀린 것으로 잡힌다. v0.23.0 배포 뒤 제품 상세의 P75 CLS 가 0.001 에서 0.27 로 올랐다.
 * jsdom 은 레이아웃을 계산하지 않아 측정으로는 잡을 수 없으므로 소스를 검사한다.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const component = read("./ShelfIntroSpotlight.tsx");
const utility = (name: string) =>
  new RegExp(`@utility ${name} \\{[\\s\\S]*?\\n\\}`).exec(read("../../app/globals.css"))?.[0];

describe("파우치 소개의 레이아웃 이동 가드", () => {
  it("소개의 자리를 top · left 변수로 잡지 않는다", () => {
    expect(component).not.toMatch(/(?:top|left)-\(--spot-/);
  });

  it("전환에 top · left 나 all 을 넣지 않는다", () => {
    expect(utility("spotlight-move")).toMatch(/transition-property: translate/);
    expect(utility("spotlight-move")).not.toMatch(/transition-property:[^;]*\b(?:all|top|left)\b/);
  });
});
