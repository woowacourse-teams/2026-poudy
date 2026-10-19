// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialLoginButtons } from "./SocialLoginButtons";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const LAST_LOGIN_KEY = "poudy.last-login.v1";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("소셜 로그인 버튼", () => {
  it("이 기기에서 로그인한 적이 없으면 이름이 적힌 버튼을 보여 주고 최근 로그인 표시는 없다", () => {
    render(<SocialLoginButtons />);

    expect(screen.getByRole("link", { name: "카카오로 시작하기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google로 시작하기" })).toBeInTheDocument();
    expect(screen.queryByText("최근 로그인")).toBeNull();
  });

  it("마지막에 로그인한 방법에만 최근 로그인을 표시한다", () => {
    localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify({ version: 1, value: "google" }));

    render(<SocialLoginButtons />);

    expect(screen.getByRole("link", { name: "Google로 시작하기 최근 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "카카오로 시작하기" })).toBeInTheDocument();
  });
});
