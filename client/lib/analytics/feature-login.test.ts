/** @vitest-environment jsdom */
import type { UserResponse } from "@poudy/api/api.zod";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { completeFeatureIntent, readFeatureLogin, requestFeatureLogin } from "./feature-login";
import { completeLoginAnalytics, startLoginAnalytics } from "./login";

import { rememberLoginReturn } from "@/lib/storage/login-return";
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("./track", () => ({ track }));
vi.mock("./identity", () => ({ identifyAnalyticsMember: vi.fn(), analyticsAuthState: () => "signed_out" }));
const member: UserResponse = {
  id: 1,
  provider: "KAKAO",
  email: "test@example.com",
  nickname: "회원",
  profileImageUrl: null,
  gender: null,
  ageRange: null,
  skinType: null,
  sensitiveSkin: null,
};
beforeEach(() => {
  track.mockClear();
  window.sessionStorage.clear();
});
afterEach(() => vi.useRealTimers());

it("로그인 성공만으로 원래 행동을 완료 처리하지 않고 같은 루틴의 가져오기 성공만 한 번 센다", () => {
  requestFeatureLogin("routine_import", 12);
  const id = readFeatureLogin()!.feature_flow_id;
  completeFeatureIntent("routine_import", 12);
  expect(track).not.toHaveBeenCalledWith("feature_intent_completed", expect.anything());
  startLoginAnalytics("kakao");
  completeLoginAnalytics(member);
  expect(track).toHaveBeenCalledWith(
    "login_succeeded",
    expect.objectContaining({ login_source: "routine", feature_flow_id: id }),
  );
  completeFeatureIntent("routine_like", 12);
  completeFeatureIntent("routine_import", 13);
  expect(track).not.toHaveBeenCalledWith("feature_intent_completed", expect.anything());
  completeFeatureIntent("routine_import", 12);
  completeFeatureIntent("routine_import", 12);
  expect(track.mock.calls.filter(([name]) => name === "feature_intent_completed")).toEqual([
    ["feature_intent_completed", expect.objectContaining({ feature_flow_id: id, target_id: 12 })],
  ]);
});

it("나중에 시작한 요청을 이전 로그인 응답으로 성공 처리하지 않는다", () => {
  requestFeatureLogin("routine_import", 12);
  startLoginAnalytics("kakao");
  requestFeatureLogin("routine_import", 13);
  completeLoginAnalytics(member);
  completeFeatureIntent("routine_import", 13);
  expect(track).not.toHaveBeenCalledWith("feature_intent_completed", expect.anything());
});

it("만료된 기능 요청은 다른 로그인에 연결하지 않는다", () => {
  vi.useFakeTimers();
  requestFeatureLogin("similar_shelf");
  vi.advanceTimersByTime(61 * 60 * 1000);
  expect(readFeatureLogin()).toBeUndefined();
  startLoginAnalytics("kakao");
  expect(track).toHaveBeenCalledWith(
    "login_started",
    expect.objectContaining({ login_source: "other" }),
    expect.anything(),
  );
});

it("다른 화면에서 새 로그인을 시작하면 취소한 기능 요청을 이어받지 않는다", () => {
  window.history.replaceState(null, "", "/routines/feed");
  requestFeatureLogin("routine_import", 12);
  window.history.replaceState(null, "", "/my-page");
  rememberLoginReturn();
  expect(readFeatureLogin()).toBeUndefined();
  startLoginAnalytics("kakao");
  completeLoginAnalytics(member);
  completeFeatureIntent("routine_import", 12);
  expect(track).toHaveBeenCalledWith(
    "login_started",
    expect.objectContaining({ login_source: "other" }),
    expect.anything(),
  );
  expect(track).not.toHaveBeenCalledWith("feature_intent_completed", expect.anything());
});
