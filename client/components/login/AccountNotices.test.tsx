/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { LoginCallback } from "./LoginCallback";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

describe("로그인 결과 안내", () => {
  it("탈퇴한 계정이면 탈퇴한 날과 복구를 요청할 수 있는 마지막 날을 한국 날짜로 알려 준다", async () => {
    render(<LoginCallback error={null} provider={null} status="WITHDRAWN" />, { wrapper: ToastProvider });

    // 탈퇴한 날과 마지막 날을 줄을 나눠 알리고, 마지막 날만 굵게 강조한다(S55g).
    const deadline = await screen.findByText("2026년 11월 4일까지", { selector: "strong" });
    expect(deadline.parentElement).toHaveTextContent("2026년 11월 4일까지 복구를 요청할 수 있어요.");
    expect(screen.getByText("2026년 10월 5일에 탈퇴했어요.")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByText("카카오로 로그인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복구 요청하기" })).toBeEnabled();
    expect(screen.getByText("복구되면 그대로 돌아와요")).toBeInTheDocument();
    expect(screen.getByText("선반에 올린 제품과 평가")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다음에 할게요" })).toHaveAttribute("href", "/");
    // 상단 ‹ 도 [다음에 할게요]와 같이 홈으로 간다(S55g).
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("복구를 요청하면 요청 완료 화면으로 바뀌고 [확인]으로 홈에 간다", async () => {
    render(<LoginCallback error={null} provider={null} status="WITHDRAWN" />, { wrapper: ToastProvider });
    await screen.findByText("member@example.com");

    await userEvent.click(screen.getByRole("button", { name: "복구 요청하기" }));

    expect(await screen.findByRole("heading", { name: "복구를 요청했어요" })).toBeInTheDocument();
    expect(screen.getByText("관리자가 확인한 뒤 복구돼요.")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("이미 복구를 요청한 계정으로 다시 로그인하면 요청 완료 화면을 보여 준다", async () => {
    render(<LoginCallback error={null} provider={null} status="RESTORE_REQUESTED" />, { wrapper: ToastProvider });

    expect(screen.getByRole("heading", { name: "복구를 요청했어요" })).toBeInTheDocument();
    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "복구 요청하기" })).not.toBeInTheDocument();
  });

  it("탈퇴 정보를 읽지 못해도 복구 요청은 할 수 있다", async () => {
    server.use(
      http.get("*/api/auth/withdrawn", () =>
        HttpResponse.json(
          { title: "Not Found", status: 404, detail: "없음", code: "WITHDRAWN_MEMBER_NOT_FOUND" },
          { status: 404 },
        ),
      ),
    );

    render(<LoginCallback error={null} provider={null} status="WITHDRAWN" />, { wrapper: ToastProvider });

    expect(await screen.findByText(/이 계정을 다시 쓰려면 복구를 요청해 주세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복구 요청하기" })).toBeEnabled();
  });

  it("다른 방법으로 가입한 이메일이면 그 이메일과 가입한 방법으로 로그인할 길을 보여 준다", async () => {
    server.use(
      http.get("*/api/auth/registered-account", () =>
        HttpResponse.json({ provider: "GOOGLE", email: "member@gmail.com" }),
      ),
    );

    render(<LoginCallback error="MEMBER_EMAIL_ALREADY_REGISTERED" provider="GOOGLE" status={null} />, {
      wrapper: ToastProvider,
    });

    expect(await screen.findByText("member@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Google로 가입한 이메일이에요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Google로 로그인/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/oauth2/authorization/google"),
    );
    expect(screen.getByRole("link", { name: "다른 방법으로 로그인" })).toHaveAttribute("href", "/login");
  });
});
