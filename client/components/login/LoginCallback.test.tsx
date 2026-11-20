// @vitest-environment jsdom

import { ToastProvider } from "@poudy/design-system/toast";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    window.sessionStorage.setItem("poudy.login-return.v1", "/my-page/filter");
    vi.mocked(findMe).mockResolvedValue({ provider: "KAKAO" } as Awaited<ReturnType<typeof findMe>>);

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-page/filter"));
  });

  it("세션을 확인하지 못하면 다음 화면으로 보내지 않는다", async () => {
    vi.mocked(findMe).mockRejectedValue(new Error("unauthorized"));

    render(<LoginCallback error={null} provider={null} status="SIGNED_IN" />, { wrapper: ToastProvider });

    await waitFor(() => expect(findMe).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "로그인하지 못했어요" })).toBeInTheDocument();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("로그인에 실패하면 실패 이유를 문장마다 줄을 나눠 알리고 로그인 화면으로 돌아갈 길을 둔다(S353)", () => {
    render(<LoginCallback error="OAUTH_EMAIL_NOT_VERIFIED" provider={null} status={null} />, {
      wrapper: ToastProvider,
    });

    expect(screen.getByRole("heading", { name: "로그인하지 못했어요" })).toBeInTheDocument();
    // 줄바꿈 문자는 ErrorState 의 whitespace-pre-line 으로 화면에서 줄을 나눈다.
    expect(
      screen.getByText("인증된 이메일이 있는 계정으로만 가입할 수 있어요.\n계정의 이메일 인증 상태를 확인해 주세요.", {
        normalizer: (text) => text,
      }),
    ).toHaveClass("whitespace-pre-line");
    expect(screen.getByRole("link", { name: "로그인 화면으로" })).toHaveAttribute("href", "/login");
    expect(findMe).not.toHaveBeenCalled();
  });
});
