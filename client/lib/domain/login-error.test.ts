import { describe, expect, it } from "vitest";

import { loginErrorMessage } from "./login-error";

describe("소셜 로그인 오류 문구", () => {
  it("이메일 중복이면 먼저 가입한 제공자로 로그인하라고 안내한다", () => {
    expect(loginErrorMessage("MEMBER_EMAIL_ALREADY_REGISTERED", "KAKAO")).toBe(
      "이미 카카오로 가입한 이메일이에요. 카카오로 로그인해 주세요.",
    );
    expect(loginErrorMessage("MEMBER_EMAIL_ALREADY_REGISTERED", "GOOGLE")).toBe(
      "이미 Google로 가입한 이메일이에요. Google로 로그인해 주세요.",
    );
  });

  it("이메일 중복인데 제공자를 모르면 일반 안내를 보여 준다", () => {
    expect(loginErrorMessage("MEMBER_EMAIL_ALREADY_REGISTERED", null)).toBe(
      "다른 로그인 방식으로 이미 가입한 이메일이에요.",
    );
  });

  it("인증되지 않은 이메일이면 계정의 이메일 인증을 확인하라고 안내한다", () => {
    expect(loginErrorMessage("OAUTH_EMAIL_NOT_VERIFIED", null)).toContain("이메일 인증");
  });

  it("그 밖의 오류는 다시 시도하라고 안내한다", () => {
    expect(loginErrorMessage("OAUTH_LOGIN_FAILED", null)).toBe("로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    expect(loginErrorMessage("UNKNOWN", "KAKAO")).toBe("로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  });
});
