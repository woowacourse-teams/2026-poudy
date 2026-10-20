/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { ProductSaveProvider, SaveProductButton } from "./SaveProductButton";

import type { UserProductState } from "@/lib/api/user-product.server";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import { server } from "@/mocks/server";

const view = (initialState: UserProductState) => (
  <ProductSaveProvider productId={1} initialState={initialState}>
    <SaveProductButton productId={1} productName="제품" />
    <SaveProductButton productId={1} productName="제품" variant="icon" />
  </ProductSaveProvider>
);

beforeEach(() => {
  navigation.push.mockClear();
  navigation.refresh.mockClear();
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
});

describe("서버에서 받은 제품 저장 상태", () => {
  it("서버 HTML부터 두 버튼에 저장됨을 표시하고 마운트 때 추가 조회하지 않는다", async () => {
    const initial: UserProductState = { status: "ready", wishlisted: true, shelved: false };
    const markup = renderToString(view(initial));
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(2);
    let reads = 0;
    server.use(
      http.get("*/api/users/me/wishlist/products", () => {
        reads++;
        return HttpResponse.json({ items: [] });
      }),
    );
    render(view(initial));
    expect(screen.getAllByRole("button", { name: "제품 저장 해제" })).toHaveLength(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reads).toBe(0);
    expect(screen.getAllByRole("button", { name: "제품 저장 해제" })).toHaveLength(2);
  });

  it("본문에서 저장을 해제하면 축약형도 함께 바뀐다", async () => {
    render(view({ status: "ready", wishlisted: true, shelved: true }));
    await userEvent.click(screen.getAllByRole("button", { name: "제품 저장 해제" })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "제품 저장" })[0]).not.toBeDisabled());
    expect(screen.getAllByRole("button", { name: "제품 저장" })).toHaveLength(2);
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("변경 실패 시 두 버튼 모두 서버에서 받은 상태로 복원한다", async () => {
    server.use(
      http.delete("*/api/users/me/wishlist/products/1", () =>
        HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 }),
      ),
    );
    render(view({ status: "ready", wishlisted: true, shelved: false }));
    await userEvent.click(screen.getAllByRole("button", { name: "제품 저장 해제" })[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(screen.getAllByRole("button", { name: "제품 저장 해제" })).toHaveLength(2);
  });

  it("SSR로 받은 새 회원 상태로 갱신한다", () => {
    const { rerender } = render(view({ status: "ready", wishlisted: true, shelved: false }));
    rerender(view({ status: "ready", wishlisted: false, shelved: false }));
    expect(screen.getAllByRole("button", { name: "제품 저장" })).toHaveLength(2);
  });

  it("비회원은 저장 요청 없이 로그인으로 이동한다", async () => {
    render(view({ status: "signedOut", wishlisted: false, shelved: false }));
    await userEvent.click(screen.getAllByRole("button", { name: "제품 저장" })[0]);
    expect(navigation.push).toHaveBeenCalledWith("/login");
    expect(screen.getAllByRole("button", { name: "제품 저장" })).toHaveLength(2);
  });

  it("관리자 세션에는 회원 로그인 안내를 보여 준다", async () => {
    render(view({ status: "adminSession", wishlisted: false, shelved: false }));
    await userEvent.click(screen.getAllByRole("button", { name: "제품 저장" })[0]);
    expect(window.alert).toHaveBeenCalledWith(ADMIN_SESSION_MESSAGE);
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
