/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { completeLoginReturn, rememberLoginReturn, rememberSwaggerLoginReturn, takeLoginReturn } from "./login-return";

const visit = (path: string) => window.history.replaceState(null, "", path);

beforeEach(() => {
  window.sessionStorage.clear();
  visit("/");
});

describe("login-return", () => {
  it("기억한 페이지를 쿼리까지 돌려주고 한 번 꺼내면 지운다", () => {
    visit("/my-page/wishlist?sort=NAME_ASC");
    rememberLoginReturn();

    expect(takeLoginReturn()).toBe("/my-page/wishlist?sort=NAME_ASC");
    expect(takeLoginReturn()).toBe("/");
  });

  it("기억한 페이지가 없으면 홈으로 보낸다", () => {
    expect(takeLoginReturn()).toBe("/");
  });

  it.each(["/login", "/login?signup=required", "/login/callback", "/signup/profile"])(
    "로그인 흐름 안의 %s 은 기억하지 않는다",
    (path) => {
      visit(path);
      rememberLoginReturn();

      expect(takeLoginReturn()).toBe("/");
    },
  );

  it.each(["//evil.example.com", "https://evil.example.com/wishlist", "wishlist"])(
    "사이트 밖으로 나가는 %s 은 저장돼 있어도 따르지 않는다",
    (path) => {
      window.sessionStorage.setItem("poudy.login-return.v1", path);

      expect(takeLoginReturn()).toBe("/");
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("로그인 후 실제 화면 이동", () => {
  it("Swagger 복귀는 Next 라우터 대신 문서 전체를 이동한다", () => {
    const replace = vi.fn();
    const replaceLocation = vi.fn();
    vi.stubGlobal("location", { replace: replaceLocation });
    rememberSwaggerLoginReturn();

    completeLoginReturn(replace);

    expect(replaceLocation).toHaveBeenCalledWith("/api/admin/swagger-ui.html");
    expect(replace).not.toHaveBeenCalled();
    expect(takeLoginReturn()).toBe("/");
  });
});

it("Swagger 로그인 팝업은 닫고 닫기가 차단되면 Swagger로 이동한다", () => {
  vi.useFakeTimers();
  const close = vi.spyOn(window, "close").mockImplementation(() => undefined);
  const replaceLocation = vi.fn();
  const replace = vi.fn();
  vi.stubGlobal("location", { replace: replaceLocation });
  rememberSwaggerLoginReturn(true);
  completeLoginReturn(replace);
  expect(close).toHaveBeenCalledOnce();
  expect(replaceLocation).not.toHaveBeenCalled();
  vi.advanceTimersByTime(250);
  expect(replaceLocation).toHaveBeenCalledWith("/api/admin/swagger-ui.html");
  expect(replace).not.toHaveBeenCalled();
});
