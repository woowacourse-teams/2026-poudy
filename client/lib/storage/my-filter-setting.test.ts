/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";

import { isMyFilterOn, readMyFilterOn, writeMyFilterOn } from "./my-filter-setting";

afterEach(() => {
  document.cookie = "poudy-my-filter=; path=/; max-age=0";
});

describe("나만의 필터 설정 쿠키", () => {
  it("쿠키가 없거나 모르는 값이면 기본인 켬이다", () => {
    expect(readMyFilterOn()).toBe(true);
    expect(isMyFilterOn(undefined)).toBe(true);
    expect(isMyFilterOn("unknown")).toBe(true);
  });

  it("끄거나 다시 켜면 쿠키에 남기고 그 값을 읽는다", () => {
    writeMyFilterOn(false);
    expect(document.cookie).toContain("poudy-my-filter=off");
    expect(readMyFilterOn()).toBe(false);

    writeMyFilterOn(true);
    expect(readMyFilterOn()).toBe(true);
  });

  it("이름이 비슷한 다른 쿠키와 헷갈리지 않는다", () => {
    document.cookie = "x-poudy-my-filter=off; path=/";
    expect(readMyFilterOn()).toBe(true);
    document.cookie = "x-poudy-my-filter=; path=/; max-age=0";
  });
});
