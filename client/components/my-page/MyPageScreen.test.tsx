/**
 * @vitest-environment jsdom
 */
import type { UserResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { MyPageScreen } from "./MyPageScreen";

import { setMockSavedProducts } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const member = (profile: Pick<UserResponse, "gender" | "ageRange" | "skinType">): UserResponse => ({
  id: 1,
  provider: "KAKAO",
  email: "member@example.com",
  sensitiveSkin: null,
  ...profile,
});

const renderWith = async (profile: Pick<UserResponse, "gender" | "ageRange" | "skinType">) => {
  server.use(http.get("*/api/users/me", () => HttpResponse.json(member(profile))));
  render(<MyPageScreen />, { wrapper: ToastProvider });
  await screen.findByText("member@example.com");
};

describe("마이페이지", () => {
  it("고른 정보는 이름으로, 고르지 않은 정보는 선택이 필요하다고 보여 준다", async () => {
    await renderWith({ gender: null, ageRange: "TWENTIES", skinType: "COMBINATION" });

    expect(within(screen.getByRole("link", { name: /성별/ })).getByText("선택 필요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /나이대/ })).toHaveTextContent("20대");
    expect(screen.getByRole("link", { name: /피부 타입/ })).toHaveTextContent("복합성");
    expect(screen.getByRole("link", { name: /성별/ })).toHaveAttribute("href", "/my-page/gender");
  });

  it("위시리스트에 담은 제품 수를 보여 준다", async () => {
    setMockSavedProducts([1, 2]);

    await renderWith({ gender: null, ageRange: null, skinType: null });

    await waitFor(() => expect(screen.getByRole("link", { name: /위시리스트/ })).toHaveTextContent("2개"));
    expect(screen.getByRole("link", { name: /위시리스트/ })).toHaveAttribute("href", "/my-page/wishlist");
  });

  it("나만의 필터에 든 성분 수를 보여 주고 관리 화면으로 보낸다", async () => {
    server.use(
      http.get("*/api/users/me/skin-filter", () =>
        HttpResponse.json({
          items: [{ id: 9001, koreanName: "리모넨", formulationRoles: [], skinEffects: [], excludeCodes: [] }],
        }),
      ),
    );
    await renderWith({ gender: null, ageRange: null, skinType: null });

    const row = screen.getByRole("link", { name: /나만의 필터/ });
    await waitFor(() => expect(row).toHaveTextContent("성분 1개"));
    expect(row).toHaveAttribute("href", "/my-page/filter");
  });

  it("로그아웃은 시트에서 한 번 더 확인한 뒤에 하고 로그인 화면으로 보낸다", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    server.use(
      http.post("*/api/users/logout", () => {
        logout();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderWith({ gender: null, ageRange: null, skinType: null });

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    const sheet = await screen.findByRole("dialog", { name: "로그아웃할까요?" });
    expect(logout).not.toHaveBeenCalled();

    await user.click(within(sheet).getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("피부 타입 뒤에 민감한지를 함께 보여 준다", async () => {
    server.use(
      http.get("*/api/users/me", () =>
        HttpResponse.json({ ...member({ gender: null, ageRange: null, skinType: "DRY" }), sensitiveSkin: true }),
      ),
    );
    render(<MyPageScreen />, { wrapper: ToastProvider });

    expect(await screen.findByRole("link", { name: /피부 타입/ })).toHaveTextContent("건성 · 민감성");
  });

  it("이메일 줄은 가입한 로그인 방법을 함께 읽어 주고 누를 수 없다", async () => {
    await renderWith({ gender: null, ageRange: null, skinType: null });

    expect(screen.getByText("카카오 계정")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /이메일/ })).not.toBeInTheDocument();
  });

  it("서비스 소개로 보낸다", async () => {
    await renderWith({ gender: null, ageRange: null, skinType: null });

    expect(screen.getByRole("link", { name: "서비스 소개" })).toHaveAttribute("href", "/about");
  });

  it("탈퇴는 확인 화면으로 보낸다", async () => {
    await renderWith({ gender: null, ageRange: null, skinType: null });

    expect(screen.getByRole("link", { name: "탈퇴하기" })).toHaveAttribute("href", "/my-page/withdraw");
  });

  it("로그아웃하지 못하면 토스트로 알리고 화면에 남는다", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/users/logout", () => HttpResponse.json({ code: "INTERNAL" }, { status: 500 })));
    router.replace.mockClear();
    await renderWith({ gender: null, ageRange: null, skinType: null });

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    const sheet = await screen.findByRole("dialog", { name: "로그아웃할까요?" });
    await user.click(within(sheet).getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByText("로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("회원 정보를 읽지 못하면 오류를 알리고 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("*/api/users/me", () =>
        fail
          ? HttpResponse.json({ code: "INTERNAL" }, { status: 500 })
          : HttpResponse.json(member({ gender: null, ageRange: null, skinType: null })),
      ),
    );
    render(<MyPageScreen />, { wrapper: ToastProvider });

    await screen.findByRole("heading", { name: "회원 정보를 불러오지 못했어요" });
    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
  });
});
