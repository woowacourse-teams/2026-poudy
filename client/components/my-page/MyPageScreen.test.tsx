/**
 * @vitest-environment jsdom
 */
import type { UserResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { MyPageScreen } from "./MyPageScreen";

import { reloadSavedProducts } from "@/lib/storage/saved-products";
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
  render(<MyPageScreen />);
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
    await reloadSavedProducts();

    await renderWith({ gender: null, ageRange: null, skinType: null });

    expect(screen.getByRole("link", { name: /위시리스트/ })).toHaveTextContent("2개");
    expect(screen.getByRole("link", { name: /위시리스트/ })).toHaveAttribute("href", "/wishlist");
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

  it("탈퇴는 확인 화면으로 보낸다", async () => {
    await renderWith({ gender: null, ageRange: null, skinType: null });

    expect(screen.getByRole("link", { name: "탈퇴하기" })).toHaveAttribute("href", "/my-page/withdraw");
  });
});
