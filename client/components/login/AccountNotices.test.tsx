/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { LoginCallback } from "./LoginCallback";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

describe("로그인 결과 안내", () => {
  it("탈퇴한 계정이면 탈퇴한 날과 되살릴 수 있는 마지막 날을 한국 날짜로 알려 준다", async () => {
    render(<LoginCallback error={null} provider={null} status="WITHDRAWN" />);

    expect(await screen.findByText(/2026년 10월 5일에 탈퇴했어요\. 2026년 11월 4일까지 되살리면/)).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계정 되살리기" })).toBeEnabled();
    expect(screen.getByText("선반에 올린 제품과 평가")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다음에 할게요" })).toHaveAttribute("href", "/");
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

    render(<LoginCallback error={null} provider={null} status="WITHDRAWN" />);

    expect(await screen.findByText(/이 계정을 다시 쓰려면 복구를 요청해 주세요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계정 되살리기" })).toBeEnabled();
  });

  it("다른 방법으로 가입한 이메일이면 그 이메일과 가입한 방법으로 로그인할 길을 보여 준다", async () => {
    server.use(
      http.get("*/api/auth/registered-account", () =>
        HttpResponse.json({ provider: "GOOGLE", email: "member@gmail.com" }),
      ),
    );

    render(<LoginCallback error="MEMBER_EMAIL_ALREADY_REGISTERED" provider="GOOGLE" status={null} />);

    expect(await screen.findByText("member@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Google로 가입한 이메일이에요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Google로 로그인/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/oauth2/authorization/google"),
    );
    expect(screen.getByRole("link", { name: "다른 방법으로 로그인" })).toHaveAttribute("href", "/login");
  });
});
