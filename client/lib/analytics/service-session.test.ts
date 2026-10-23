/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";

import { updateServiceSession } from "./service-session";

beforeEach(() => localStorage.clear());

describe("서비스 세션 누적", () => {
  it("새로고침과 다른 탭에서도 같은 세션은 이어 세고 도달 기준을 반복하지 않는다", () => {
    expect(updateServiceSession("session-a")).toEqual({ started: true, activeSeconds: 0, reached: [] });
    expect(updateServiceSession("session-a", 12)).toEqual({ started: false, activeSeconds: 12, reached: [10] });
    expect(updateServiceSession("session-a")).toEqual({ started: false, activeSeconds: 12, reached: [] });
    expect(updateServiceSession("session-a", 20)).toEqual({ started: false, activeSeconds: 32, reached: [30] });
    expect(updateServiceSession("session-a", 30)).toEqual({ started: false, activeSeconds: 62, reached: [60] });
    expect(updateServiceSession("session-a", 20)).toEqual({ started: false, activeSeconds: 82, reached: [] });
  });

  it("새 SDK 세션에는 이전 시간과 도달 상태를 넘기지 않는다", () => {
    updateServiceSession("old", 59);
    expect(updateServiceSession("new")).toEqual({ started: true, activeSeconds: 0, reached: [] });
    expect(updateServiceSession("new", 1)).toEqual({ started: false, activeSeconds: 1, reached: [] });
  });

  it("외부에서 바뀐 저장 값의 모양을 검증한다", () => {
    localStorage.setItem(
      "poudy_service_active_time",
      JSON.stringify({ version: 1, value: { sessionId: "session-a", activeSeconds: "59" } }),
    );
    expect(updateServiceSession("session-a")).toEqual({ started: true, activeSeconds: 0, reached: [] });
    expect(updateServiceSession("session-a", 1)).toEqual({ started: false, activeSeconds: 1, reached: [] });
  });
});
