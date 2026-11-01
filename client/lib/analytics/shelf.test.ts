/** @vitest-environment jsdom */
import type { ShelfProductResponse, UserResponse } from "@poudy/api/api.zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { completeLoginAnalytics, markSignupAnalytics, startLoginAnalytics } from "./login";
import { completeShelfIntent, requestShelfLogin, shelfMutation, trackShelfAdded, trackShelfRating } from "./shelf";
import { beginShelfJourney, clearShelfJourney, readShelfJourney, updateShelfJourney } from "./shelf-journey";
import { track } from "./track";

vi.mock("./track", () => ({ track: vi.fn() }));
const item: ShelfProductResponse = {
  product: { id: 1, name: "제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
  usageStatus: "IN_USE",
  rating: { preference: "GOOD", moistureLevel: null, oilLevel: null },
  possiblyUnsuitable: false,
  registeredAt: "2026-10-25T00:00:00+09:00",
};
const member: UserResponse = {
  id: 3,
  provider: "KAKAO",
  email: "member@example.test",
  nickname: "포근한 다람쥐 1000",
  profileImageUrl: null,
  gender: null,
  ageRange: null,
  skinType: null,
  sensitiveSkin: null,
};
const empty = { usageStatus: "IN_USE" as const, preference: null, moistureLevel: null, oilLevel: null };
beforeEach(() => {
  sessionStorage.clear();
  clearShelfJourney();
  vi.mocked(track).mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("선반 행동 연결", () => {
  it("로그인 전 원래 제품을 담은 경우에만 완료를 한 번 기록한다", () => {
    const journey = beginShelfJourney({
      source: "product_detail",
      intent: "add_product",
      productId: 1,
      entryAuthState: "signed_out",
    });
    requestShelfLogin();
    completeShelfIntent("add_product", 1);
    expect(track).not.toHaveBeenCalledWith("shelf_intent_completed", expect.anything());
    updateShelfJourney({ loginSucceeded: true });
    completeShelfIntent("add_product", 2);
    expect(readShelfJourney()?.completed).toBe(false);
    completeShelfIntent("add_product", 1);
    completeShelfIntent("add_product", 1);
    expect(vi.mocked(track).mock.calls.filter(([name]) => name === "shelf_intent_completed")).toEqual([
      ["shelf_intent_completed", expect.objectContaining({ shelf_journey_id: journey.id, product_id: 1 })],
    ]);
  });
  it("저장소를 쓸 수 없어도 현재 화면의 진입 경로를 이어 간다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const journey = beginShelfJourney({ source: "about", intent: "view_shelf" });
    expect(readShelfJourney()?.id).toBe(journey.id);
  });
  it("만료되거나 손상된 진입 경로를 다음 로그인에 붙이지 않는다", () => {
    vi.useFakeTimers();
    beginShelfJourney({ source: "about", intent: "view_shelf" });
    vi.advanceTimersByTime(3600001);
    expect(readShelfJourney()).toBeUndefined();
    sessionStorage.setItem("poudy.shelf-journey.v1", JSON.stringify({ id: "corrupt" }));
    expect(readShelfJourney()).toBeUndefined();
  });
});

describe("적합도·사용감 저장의 의미", () => {
  it("담기와 함께 저장한 적합도는 기록하고, 아직 고르지 않은 사용감은 완료로 세지 않는다", () => {
    trackShelfAdded(item, shelfMutation("shelf_add", 1, { ratingFlowId: "rating" }));
    expect(track).toHaveBeenCalledWith(
      "shelf_product_added",
      expect.objectContaining({ has_fit_rating: true, has_sensory_rating: false, is_restore: false }),
    );
    expect(track).toHaveBeenCalledWith(
      "shelf_rating_saved",
      expect.objectContaining({
        rating_flow_id: "rating",
        fit_changed: true,
        sensory_changed: false,
        has_sensory_rating: false,
        was_unrated: true,
      }),
    );
  });
  it("평가 없이 담거나 뺀 제품을 되돌릴 때 평가 완료를 만들지 않는다", () => {
    trackShelfAdded(
      { ...item, rating: { preference: null, moistureLevel: null, oilLevel: null } },
      shelfMutation("shelf_add", 1),
    );
    trackShelfAdded(item, shelfMutation("shelf", 1, { reason: "undo" }));
    expect(vi.mocked(track).mock.calls.filter(([name]) => name === "shelf_rating_saved")).toHaveLength(0);
    expect(track).toHaveBeenCalledWith(
      "shelf_product_added",
      expect.objectContaining({ is_restore: true, mutation_reason: "undo" }),
    );
  });
  it("평가를 바꾸지 않은 저장과 사용 상태만 바꾼 조작은 평가 완료로 세지 않는다", () => {
    trackShelfRating(item, { ...empty, ...item.rating }, shelfMutation("shelf", 1));
    expect(track).not.toHaveBeenCalled();
    trackShelfRating({ ...item, usageStatus: "USED" }, { ...empty, ...item.rating }, shelfMutation("shelf", 1));
    expect(vi.mocked(track).mock.calls.map(([name]) => name)).toEqual(["shelf_usage_status_changed"]);
  });
  it("평가 지우기는 저장된 평가가 없는 상태로 기록한다", () => {
    trackShelfRating(
      { ...item, rating: { preference: null, moistureLevel: null, oilLevel: null } },
      { ...empty, ...item.rating },
      shelfMutation("shelf", 1),
    );
    expect(track).toHaveBeenCalledWith(
      "shelf_rating_saved",
      expect.objectContaining({ has_fit_rating: false, has_sensory_rating: false, was_unrated: false }),
    );
  });
});

describe("로그인 복귀 계측", () => {
  it("같은 선반 시도로 돌아온 회원 로그인 성공을 한 번 기록한다", () => {
    const journey = beginShelfJourney({
      source: "product_detail",
      intent: "add_product",
      productId: 1,
      entryAuthState: "signed_out",
    });
    requestShelfLogin();
    startLoginAnalytics("kakao");
    completeLoginAnalytics(member);
    completeLoginAnalytics(member);
    expect(vi.mocked(track).mock.calls.filter(([name]) => name === "login_succeeded")).toEqual([
      [
        "login_succeeded",
        expect.objectContaining({ shelf_journey_id: journey.id, login_source: "shelf", is_signup: false }),
      ],
    ]);
    expect(readShelfJourney()?.loginSucceeded).toBe(true);
  });
  it("신규 가입도 로그인 완료에 포함하고 기존 회원과 구분한다", () => {
    startLoginAnalytics("kakao");
    markSignupAnalytics();
    completeLoginAnalytics(member);
    expect(track).toHaveBeenCalledWith("signup_completed", expect.objectContaining({ login_source: "other" }));
    expect(track).toHaveBeenCalledWith("login_succeeded", expect.objectContaining({ is_signup: true }));
  });
  it("다른 선반 시도로 바뀌었으면 예전 로그인 결과로 그 시도를 완료하지 않는다", () => {
    beginShelfJourney({ source: "about", intent: "view_shelf" });
    requestShelfLogin();
    startLoginAnalytics("kakao");
    beginShelfJourney({ source: "product_detail", intent: "add_product", productId: 2 });
    completeLoginAnalytics(member);
    expect(track).toHaveBeenCalledWith("login_succeeded", expect.objectContaining({ login_source: "other" }));
    expect(readShelfJourney()?.loginSucceeded).toBe(false);
  });
});
