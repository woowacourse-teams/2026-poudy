import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";
import { isSignedOut, socialLoginUrl } from "./member";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("회원 API", () => {
  it("소셜 로그인은 공개 API 주소의 로그인 시작 경로로 이동한다", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://staging.poudy.site");

    expect(socialLoginUrl("kakao")).toBe("https://staging.poudy.site/api/oauth2/authorization/kakao");
  });

  it("로그인이 필요하거나 세션의 회원이 사라졌으면 로그아웃된 것으로 본다", () => {
    expect(isSignedOut(new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다."))).toBe(true);
    expect(isSignedOut(new ApiError(404, "MEMBER_NOT_FOUND", "회원을 찾을 수 없습니다."))).toBe(true);
  });

  it("그 밖의 실패는 로그아웃으로 보지 않는다", () => {
    expect(isSignedOut(new ApiError(500, "INTERNAL_SERVER_ERROR", "서버 오류"))).toBe(false);
    expect(isSignedOut(new Error("network"))).toBe(false);
  });
});
