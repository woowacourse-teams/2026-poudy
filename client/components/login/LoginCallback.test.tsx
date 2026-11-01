// @vitest-environment jsdom

import { ToastProvider } from "@poudy/design-system/toast";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginCallback } from "./LoginCallback";

import { findMe } from "@/lib/api/member";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/api/member", () => ({ findMe: vi.fn(), requestRestore: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("로그인 결과 화면", () => {
  it("로그인했으면 다음 화면으로 보낸다", async () => {
    vi.mocked(findMe).mockResolvedValue({ provider: "KAKAO" } as Awaited<ReturnType<typeof findMe>>);

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("로그인하러 떠난 페이지를 기억해 두었으면 그 페이지로 돌려보낸다", async () => {
    window.sessionStorage.setItem("poudy.login-return.v1", "/my-page/wishlist");
    vi.mocked(findMe).mockResolvedValue({ provider: "KAKAO" } as Awaited<ReturnType<typeof findMe>>);

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-page/wishlist"));
  });

  it("프로필 미완료 회원은 재로그인해도 프로필 설정으로 보내고 복귀 경로를 보존한다", async () => {
    window.sessionStorage.setItem("poudy.login-return.v1", "/my-page/wishlist");
    vi.mocked(findMe).mockResolvedValue({ provider: "KAKAO", profileSetupCompleted: false } as Awaited<
      ReturnType<typeof findMe>
    >);
    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/signup/profile"));
    expect(window.sessionStorage.getItem("poudy.login-return.v1")).toBe("/my-page/wishlist");
  });

  it("프로필을 완료한 회원은 재로그인 시 원래 목적지로 간다", async () => {
    window.sessionStorage.setItem("poudy.login-return.v1", "/my-page/wishlist");
    vi.mocked(findMe).mockResolvedValue({ provider: "KAKAO", profileSetupCompleted: true } as Awaited<
      ReturnType<typeof findMe>
    >);
    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-page/wishlist"));
  });

  it("세션을 확인하지 못하면 다음 화면으로 보내지 않는다", async () => {
    vi.mocked(findMe).mockRejectedValue(new Error("unauthorized"));

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });

    await waitFor(() => expect(findMe).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
