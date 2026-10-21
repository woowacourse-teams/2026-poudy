/** @vitest-environment jsdom */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { ProductSaveBar, ProductSaveProvider } from "./ProductSaveActions";

import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import type { UserProductSaveState as UserProductState } from "@/lib/domain/user-product";
import { server } from "@/mocks/server";

/** 제품 상세처럼 하단 고정 행동 바(S60)를 그린다. */
const view = (initialState: UserProductState) => (
  <ToastProvider>
    <ProductSaveProvider product={{ id: 1, name: "제품" }} entryPoint="direct" initialState={initialState}>
      <ProductSaveBar />
    </ProductSaveProvider>
  </ToastProvider>
);

const wishlistButton = () => screen.getByRole("button", { name: "위시리스트에 담기" });

beforeEach(() => {
  navigation.push.mockClear();
  navigation.refresh.mockClear();
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
});

describe("서버에서 받은 제품 저장 상태(#836)", () => {
  it("서버 HTML부터 담김을 표시하고 마운트 때 추가 조회하지 않는다", async () => {
    const initial: UserProductState = { status: "ready", wishlisted: true, shelved: true };
    const markup = renderToString(view(initial));
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup.match(/선반에 저장됨/g)).toHaveLength(1);

    let reads = 0;
    server.use(
      http.get("*/api/users/me/wishlist/products", () => {
        reads++;
        return HttpResponse.json({ items: [] });
      }),
      http.get("*/api/users/me/shelf", () => {
        reads++;
        return HttpResponse.json({ usages: [], items: [] });
      }),
    );
    render(view(initial));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reads).toBe(0);
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("위시리스트에서 빼면 바로 바꿔 보이고 화면을 새로 받는다", async () => {
    render(view({ status: "ready", wishlisted: true, shelved: false }));
    await userEvent.click(wishlistButton());
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "false");
  });

  it("바꾸지 못하면 서버에서 받은 상태로 되돌리고 토스트로 알린다", async () => {
    server.use(
      http.delete("*/api/users/me/wishlist/products/1", () =>
        HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 }),
      ),
    );
    render(view({ status: "ready", wishlisted: true, shelved: false }));
    await userEvent.click(wishlistButton());
    expect(await screen.findByText("위시리스트를 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.")).toBeInTheDocument();
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("서버가 그린 새 회원 상태로 바꾼다", () => {
    const { rerender } = render(view({ status: "ready", wishlisted: true, shelved: false }));
    rerender(view({ status: "ready", wishlisted: false, shelved: true }));
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "선반에 저장됨" })).toBeInTheDocument();
  });

  it("비회원은 담지 않고 로그인 안내 시트를 연 뒤, 로그인을 고르면 로그인 화면으로 간다", async () => {
    render(view({ status: "signedOut", wishlisted: false, shelved: false }));
    await userEvent.click(wishlistButton());

    const sheet = await screen.findByRole("dialog", { name: "로그인하고 위시리스트에 추가할까요?" });
    expect(navigation.push).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole("button", { name: "로그인" }));
    expect(navigation.push).toHaveBeenCalledWith("/login");
  });

  it("관리자 세션에는 회원 로그인 안내를 보여 준다", async () => {
    render(view({ status: "adminSession", wishlisted: false, shelved: false }));
    await userEvent.click(wishlistButton());
    expect(window.alert).toHaveBeenCalledWith(ADMIN_SESSION_MESSAGE);
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
