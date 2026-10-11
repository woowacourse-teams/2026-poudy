/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import { rememberLoginReturn, takeLoginReturn } from "./login-return";

const visit = (path: string) => window.history.replaceState(null, "", path);

beforeEach(() => {
  window.sessionStorage.clear();
  visit("/");
});

describe("login-return", () => {
  it("기억한 페이지를 쿼리까지 돌려주고 한 번 꺼내면 지운다", () => {
    visit("/saved?sort=NAME_ASC");
    rememberLoginReturn();

    expect(takeLoginReturn()).toBe("/saved?sort=NAME_ASC");
    expect(takeLoginReturn()).toBe("/");
  });

  it("기억한 페이지가 없으면 홈으로 보낸다", () => {
    expect(takeLoginReturn()).toBe("/");
  });

  it.each(["/login", "/login?signup=required", "/login/callback", "/onboarding"])(
    "로그인 흐름 안의 %s 은 기억하지 않는다",
    (path) => {
      visit(path);
      rememberLoginReturn();

      expect(takeLoginReturn()).toBe("/");
    },
  );

  it.each(["//evil.example.com", "https://evil.example.com/saved", "saved"])(
    "사이트 밖으로 나가는 %s 은 저장돼 있어도 따르지 않는다",
    (path) => {
      window.sessionStorage.setItem("poudy.login-return.v1", path);

      expect(takeLoginReturn()).toBe("/");
    },
  );
});
