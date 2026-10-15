/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { hasExplored, markExplored } from "./service-guide";

beforeEach(() => {
  window.localStorage.clear();
});

describe("service-guide", () => {
  it("처음 온 사람은 아직 탐색하지 않은 것으로 본다", () => {
    expect(hasExplored()).toBe(false);
  });

  it("탐색을 남기면 다음부터는 탐색한 것으로 본다", () => {
    markExplored();

    expect(hasExplored()).toBe(true);
  });

  it("저장된 값이 참·거짓이 아니면 버리고 처음 온 사람으로 본다", () => {
    window.localStorage.setItem("poudy.explored.v1", JSON.stringify({ version: 1, value: "yes" }));

    expect(hasExplored()).toBe(false);
  });
});
