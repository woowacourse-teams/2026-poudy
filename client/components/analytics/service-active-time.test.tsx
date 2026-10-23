/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startServiceActiveTime } from "./service-active-time";

import type { AnalyticsSession } from "@/lib/analytics/analytics-ready";
import { addServiceActiveTime } from "@/lib/analytics/service-session";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/track", () => ({ track }));

let hidden = false;
let focused = true;
let sessionId = "session-a";
const sessionListeners = new Set<(id: string) => void>();
const client: AnalyticsSession = {
  onSessionId: (callback) => {
    const listener = (id: string) => callback(id, null);
    sessionListeners.add(listener);
    listener(sessionId);
    return () => sessionListeners.delete(listener);
  },
  get_session_id: () => sessionId,
};
const changeSession = (id: string) => {
  sessionId = id;
  sessionListeners.forEach((listener) => listener(id));
};
const stops: (() => void)[] = [];
const begin = (path = "/") => {
  const tracker = startServiceActiveTime(client, path);
  stops.push(tracker.stop);
  return tracker;
};
const calls = (name: string) => track.mock.calls.filter(([event]) => event === name);
const thresholds = () => calls("service_active_time_reached").map(([, properties]) => properties.threshold_seconds);
const recordedSeconds = () =>
  calls("service_active_time_recorded").reduce((total, [, properties]) => total + properties.active_seconds, 0);
const advance = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance", "Date"] });
  localStorage.clear();
  track.mockClear();
  hidden = false;
  focused = true;
  sessionId = "session-a";
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  Reflect.deleteProperty(navigator, "locks");
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("서비스 전체 활성 시간", () => {
  it("10초 도달은 주기 전송을 기다리지 않고 기록하고 30초마다 증가분을 보낸다", () => {
    begin();
    expect(calls("service_session_started")).toHaveLength(1);
    advance(9999);
    expect(thresholds()).toEqual([]);
    advance(1);
    expect(thresholds()).toEqual([10]);
    expect(calls("service_active_time_recorded")).toHaveLength(0);
    advance(20_000);
    expect(thresholds()).toEqual([10, 30]);
    expect(recordedSeconds()).toBe(30);
    advance(60_000);
    expect(thresholds()).toEqual([10, 30, 60]);
    expect(recordedSeconds()).toBe(60);
  });

  it("렌더링된 경로가 바뀌면 이전 경로로 정산하고 누적 시간과 소수 초를 이어 센다", () => {
    const tracker = begin();
    advance(5500);
    window.history.pushState(null, "", "/search/products?keyword=private");
    tracker.navigate("/search/products");
    const [, properties] = calls("service_active_time_recorded")[0];
    expect(properties).toMatchObject({
      pathname: "/",
      $pathname: "/",
      $current_url: new URL("/", window.location.origin).href,
      active_seconds: 5,
      flush_reason: "route_change",
    });
    advance(4500);
    expect(thresholds()).toEqual([10]);
    expect(calls("service_active_time_reached")[0][1]).toMatchObject({ pathname: "/search/products" });
    tracker.stop();
    expect(recordedSeconds()).toBe(10);
  });

  it("숨김·pagehide·unmount가 겹쳐도 증가분을 한 번만 전송한다", () => {
    const tracker = begin();
    advance(12_000);
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
    advance(60_000);
    tracker.stop();
    expect(recordedSeconds()).toBe(12);
    expect(calls("service_active_time_recorded")).toHaveLength(1);
    expect(calls("service_active_time_recorded")[0][2]).toEqual({ beacon: true });
  });

  it("포커스를 잃은 시간과 60초 뒤의 자리 비움은 제외하고 입력 뒤에 다시 센다", () => {
    begin();
    advance(4000);
    focused = false;
    window.dispatchEvent(new Event("blur"));
    advance(120_000);
    focused = true;
    window.dispatchEvent(new Event("focus"));
    advance(10_000);
    window.dispatchEvent(new Event("pointerdown"));
    advance(6000);
    focused = false;
    window.dispatchEvent(new Event("blur"));
    expect(recordedSeconds()).toBe(10);
  });

  it("새로고침 뒤에도 같은 세션의 방문·도달 이벤트를 반복하지 않는다", () => {
    const first = begin();
    advance(20_000);
    first.stop();
    begin("/categories");
    advance(10_000);
    expect(calls("service_session_started")).toHaveLength(1);
    expect(thresholds()).toEqual([10, 30]);
  });

  it("자리 비움 중에는 누적·저장·전송하지 않고 입력이 돌아오면 다시 센다", () => {
    begin();
    advance(60_000);
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    advance(31 * 60_000);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(recordedSeconds()).toBe(60);
    expect(calls("service_session_started")).toHaveLength(1);
    window.dispatchEvent(new Event("pointerdown"));
    advance(30_000);
    expect(recordedSeconds()).toBe(90);
  });

  it("Web Locks 접근이 거절돼도 포커스가 있는 화면은 측정한다", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: vi.fn().mockRejectedValue(new Error("storage policy")) },
    });
    begin();
    await Promise.resolve();
    await Promise.resolve();
    advance(10_000);
    expect(thresholds()).toEqual([10]);
  });

  it("SDK 세션이 바뀌면 저장하지 않은 시간을 이후 이벤트와 같은 새 세션으로 센다", () => {
    begin();
    advance(9000);
    changeSession("session-b");
    expect(calls("service_session_started").map(([, properties]) => properties.$session_id)).toEqual([
      "session-a",
      "session-b",
    ]);
    advance(1000);
    expect(calls("service_active_time_reached")).toHaveLength(1);
    expect(calls("service_active_time_reached")[0][1]).toMatchObject({
      $session_id: "session-b",
      threshold_seconds: 10,
      session_active_seconds: 10,
    });
  });

  it("SDK가 알림 없이 세션을 바꿔도 저장하기 전에 확인해 새 세션으로 센다", () => {
    begin();
    advance(31 * 60_000);
    // SDK 유휴 정리로 세션이 바뀌었고 알림은 다음 이벤트 때 온다.
    sessionId = "session-b";
    window.dispatchEvent(new Event("pointerdown"));
    advance(30_000);
    expect(
      calls("service_active_time_reached").map(([, properties]) => [
        properties.$session_id,
        properties.threshold_seconds,
      ]),
    ).toEqual([
      ["session-a", 10],
      ["session-a", 30],
      ["session-a", 60],
      ["session-b", 10],
      ["session-b", 30],
    ]);
  });

  it("잠금을 얻을 때 다른 탭에서 바뀐 SDK 세션을 이어받고 그 누적을 지우지 않는다", () => {
    begin();
    focused = false;
    window.dispatchEvent(new Event("blur"));
    // 다른 탭이 새 세션으로 25초를 저장했지만 이 탭은 아직 알림을 받지 못했다.
    sessionId = "session-b";
    addServiceActiveTime("session-b", 25);
    focused = true;
    window.dispatchEvent(new Event("focus"));
    advance(5000);
    expect(thresholds()).toEqual([30]);
    expect(calls("service_session_started")).toHaveLength(1);
  });

  it("여러 탭이 잠금을 경쟁해도 하나만 세고 잠금을 넘긴 뒤에도 도달을 반복하지 않는다", async () => {
    let held = false;
    const queue: (() => void)[] = [];
    const request = (_name: string, options: { signal: AbortSignal }, callback: () => Promise<void>) =>
      new Promise<void>((resolve) => {
        const run = async () => {
          if (options.signal.aborted) return resolve();
          held = true;
          await callback();
          held = false;
          resolve();
          queue.shift()?.();
        };
        if (held) queue.push(() => void run());
        else void run();
      });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    const first = begin();
    begin("/categories");
    advance(20_000);
    expect(thresholds()).toEqual([10]);
    first.stop();
    await Promise.resolve();
    await Promise.resolve();
    advance(10_000);
    expect(thresholds()).toEqual([10, 30]);
    expect(calls("service_session_started")).toHaveLength(1);
  });

  it("60초 동안은 시작과 10·30·60초에만 저장하고 입력마다 저장하지 않는다", () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    begin();
    for (let second = 0; second < 60; second += 1) {
      window.dispatchEvent(new Event("pointermove"));
      advance(1000);
    }
    expect(write).toHaveBeenCalledTimes(4);
    expect(read).toHaveBeenCalledTimes(4);
    expect(recordedSeconds()).toBe(60);
    expect(thresholds()).toEqual([10, 30, 60]);
  });

  it("이동과 새로고침 뒤에는 저장한 누적 시간에서 남은 1초만 더해 도달한다", () => {
    const first = begin();
    advance(9000);
    first.stop();
    begin("/products/42");
    advance(999);
    expect(thresholds()).toEqual([]);
    advance(1);
    expect(thresholds()).toEqual([10]);
  });

  it("정산 사이에 자리 비움이 시작돼도 다음 주기 전송에 남은 활성 시간을 포함한다", () => {
    begin();
    advance(5500);
    window.dispatchEvent(new Event("wheel"));
    advance(84_501);
    expect(recordedSeconds()).toBe(65);
    expect(calls("service_active_time_recorded").map(([, properties]) => properties.active_seconds)).toEqual([
      30, 30, 5,
    ]);
  });

  it("같은 세션의 SDK 알림은 도달을 반복하지 않고 정리 뒤에는 다시 시작하지 않는다", () => {
    const tracker = begin();
    advance(9000);
    changeSession("session-a");
    advance(1000);
    expect(thresholds()).toEqual([10]);
    tracker.stop();
    changeSession("session-b");
    window.dispatchEvent(new Event("pointerdown"));
    advance(30_000);
    expect(calls("service_session_started")).toHaveLength(1);
    expect(recordedSeconds()).toBe(10);
    expect(sessionListeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("도달 전의 매초 확인은 저장소를 읽거나 쓰지 않고 이탈 때 미저장분을 정산한다", () => {
    const read = vi.spyOn(Storage.prototype, "getItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    const tracker = begin();
    read.mockClear();
    write.mockClear();
    advance(9000);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(recordedSeconds()).toBe(0);
    tracker.stop();
    expect(read).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
    expect(recordedSeconds()).toBe(9);
  });

  it("타이머가 늦게 실행돼도 실행 횟수 대신 실제 경과 시간으로 도달과 전송을 판단한다", () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    begin();
    now = 35_000;
    advance(1000);
    expect(thresholds()).toEqual([10, 30]);
    expect(recordedSeconds()).toBe(35);
    now = 65_000;
    advance(1000);
    expect(thresholds()).toEqual([10, 30, 60]);
    expect(recordedSeconds()).toBe(60);
  });
});
