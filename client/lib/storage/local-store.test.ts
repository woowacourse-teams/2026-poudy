/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { createLocalStore, isNumberArray } from "./local-store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("createLocalStore", () => {
  const make = () => createLocalStore<number[]>("test.key", { version: 1, fallback: [], isValid: isNumberArray });

  it("저장한 값을 그대로 읽는다", () => {
    const store = make();
    store.write([1, 2]);
    expect(store.read()).toEqual([1, 2]);
  });

  it("저장된 값이 없으면 기본값을 준다", () => {
    expect(make().read()).toEqual([]);
  });

  it("JSON 이 깨져 있으면 기본값으로 되돌린다", () => {
    window.localStorage.setItem("test.key", "{망가진 값");
    expect(make().read()).toEqual([]);
  });

  it("기대한 모양이 아니면 기본값으로 되돌린다", () => {
    window.localStorage.setItem("test.key", JSON.stringify({ version: 1, value: "숫자가 아님" }));
    expect(make().read()).toEqual([]);
  });

  it("버전이 다르면 버린다", () => {
    window.localStorage.setItem("test.key", JSON.stringify({ version: 99, value: [1] }));
    expect(make().read()).toEqual([]);
  });

  it("clear 하면 기본값으로 돌아간다", () => {
    const store = make();
    store.write([1]);
    store.clear();
    expect(store.read()).toEqual([]);
  });
});
