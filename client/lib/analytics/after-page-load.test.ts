/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { afterPageLoad } from "./after-page-load";

let cancel: (() => void) | undefined;
const idle = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  idle.mockReset().mockReturnValue(7);
  vi.stubGlobal("requestIdleCallback", idle);
  vi.stubGlobal("cancelIdleCallback", vi.fn());
  vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
});
afterEach(() => {
  cancel?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("load 뒤 idle에서 시작하며 기다리는 시간을 제한한다", () => {
  const start = vi.fn();
  cancel = afterPageLoad(start);
  expect(idle).not.toHaveBeenCalled();
  window.dispatchEvent(new Event("load"));
  expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 });
  expect(start).not.toHaveBeenCalled();
  idle.mock.calls[0][0]();
  expect(start).toHaveBeenCalledOnce();
  window.dispatchEvent(new Event("pointerdown"));
  expect(start).toHaveBeenCalledOnce();
});

it.each(["pointerdown", "keydown", "pagehide"])("%s가 먼저 오면 대기를 끝낸다", (event) => {
  const start = vi.fn();
  cancel = afterPageLoad(start);
  window.dispatchEvent(new Event(event));
  window.dispatchEvent(new Event("load"));
  expect(start).toHaveBeenCalledOnce();
  expect(idle).not.toHaveBeenCalled();
});

it("이미 로딩된 페이지에서도 실행한다", () => {
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  const start = vi.fn();
  cancel = afterPageLoad(start);
  expect(idle).toHaveBeenCalledOnce();
});

it("탭이 보이는 알림 이후에도 숨겨지는 알림을 받아 대기를 끝낸다", () => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const start = vi.fn();
  cancel = afterPageLoad(start);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(start).not.toHaveBeenCalled();
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(start).toHaveBeenCalledOnce();
});

it("idle API가 없는 브라우저는 load 이후 타이머를 쓴다", () => {
  vi.stubGlobal("requestIdleCallback", undefined);
  const start = vi.fn();
  cancel = afterPageLoad(start);
  window.dispatchEvent(new Event("load"));
  expect(start).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(start).toHaveBeenCalledOnce();
});
