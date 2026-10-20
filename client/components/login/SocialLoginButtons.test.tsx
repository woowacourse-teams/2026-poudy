// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialLoginButtons } from "./SocialLoginButtons";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

afterEach(() => {
  cleanup();
});

describe("소셜 로그인 버튼", () => {
  it("이름이 적힌 넓은 버튼을 보여 주고 최근 로그인 표시는 두지 않는다(S37)", () => {
    render(<SocialLoginButtons />);

    expect(screen.getByRole("link", { name: "카카오로 시작하기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google로 시작하기" })).toBeInTheDocument();
    expect(screen.queryByText("최근 로그인")).toBeNull();
  });
});
