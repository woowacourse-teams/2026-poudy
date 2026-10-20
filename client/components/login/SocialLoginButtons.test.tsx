// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialLoginButtons } from "./SocialLoginButtons";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const LAST_LOGIN_KEY = "poudy.last-login.v1";

const linkNames = () => screen.getAllByRole("link").map((link) => link.textContent);
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("소셜 로그인 버튼", () => {
  it("이 기기에서 로그인한 적이 없으면 카카오, Google 순서로 두고 최근 로그인 표시는 없다(S37)", () => {
    render(<SocialLoginButtons />);

    expect(linkNames()).toEqual(["카카오로 시작하기", "Google로 시작하기"]);
    expect(screen.queryByText("최근 로그인")).toBeNull();
  });

  it("마지막에 카카오로 로그인했으면 카카오 버튼 이름에 최근 로그인을 덧붙인다(S37c)", () => {
    localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify({ version: 1, value: "kakao" }));

    render(<SocialLoginButtons />);

    expect(screen.getAllByRole("link")[0]).toHaveAccessibleName("카카오로 시작하기, 최근 로그인");
    expect(screen.getAllByRole("link")[1]).toHaveAccessibleName("Google로 시작하기");
  });

  it("마지막에 Google로 로그인했으면 Google 버튼을 맨 위로 올린다(S37c-2)", () => {
    localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify({ version: 1, value: "google" }));

    render(<SocialLoginButtons />);

    expect(screen.getAllByRole("link")[0]).toHaveAccessibleName("Google로 시작하기, 최근 로그인");
    expect(screen.getAllByRole("link")[1]).toHaveAccessibleName("카카오로 시작하기");
  });
});
