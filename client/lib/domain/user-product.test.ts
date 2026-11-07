import { describe, expect, it } from "vitest";

import { SIGNED_OUT_USER_PRODUCT, isShelfIntroTarget, userProductWithout, type UserProductState } from "./user-product";

const member = (state: Partial<UserProductState>): UserProductState => ({
  ...SIGNED_OUT_USER_PRODUCT,
  status: "ready",
  ...state,
});

describe("isShelfIntroTarget", () => {
  it("로그인 전이면 띄운다", () => {
    expect(isShelfIntroTarget(SIGNED_OUT_USER_PRODUCT)).toBe(true);
  });

  it("이 제품을 담지 않았고 나만의 필터가 빈 회원이면 띄운다", () => {
    expect(isShelfIntroTarget(member({ shelved: false, myFilterEmpty: true }))).toBe(true);
  });

  it("이 제품을 이미 담은 회원에게는 띄우지 않는다", () => {
    expect(isShelfIntroTarget(member({ shelved: true, myFilterEmpty: true }))).toBe(false);
  });

  it("나만의 필터가 있는 회원에게는 띄우지 않는다", () => {
    expect(isShelfIntroTarget(member({ shelved: false, myFilterEmpty: false }))).toBe(false);
  });

  it("관리자 세션에는 띄우지 않는다", () => {
    expect(isShelfIntroTarget(userProductWithout("adminSession"))).toBe(false);
  });
});
