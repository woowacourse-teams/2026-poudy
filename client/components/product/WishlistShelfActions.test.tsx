/** @vitest-environment jsdom */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { ProductScrollState } from "./ProductScrollState";
import { WishlistHeartButton, WishlistShelfBar, WishlistShelfProvider, WishlistShelfRow } from "./WishlistShelfActions";

import { addGuestShelfProduct, leaveGuestShelfMode } from "@/lib/api/guest-shelf";
import { ADMIN_SESSION_MESSAGE } from "@/lib/domain/admin-session";
import type { RatingDraft } from "@/lib/domain/shelf";
import type { WishlistShelfState } from "@/lib/domain/user-product";
import { clearGuestShelf, readGuestShelf } from "@/lib/storage/guest-shelf";
import { server } from "@/mocks/server";

/** 제품 상세처럼 제품 요약의 버튼 줄(S24)을 그린다. */
const view = (initialState: WishlistShelfState, bar = false) => (
  <ToastProvider>
    <ProductScrollState>
      <WishlistShelfProvider
        product={{ id: 1, name: "제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true }}
        entryPoint="direct"
        initialState={initialState}
      >
        <WishlistHeartButton />
        {bar ? <WishlistShelfBar comparison={null} /> : <WishlistShelfRow comparison={null} />}
      </WishlistShelfProvider>
    </ProductScrollState>
  </ToastProvider>
);

const wishlistButton = () => screen.getByRole("button", { name: "위시리스트에 추가" });

afterEach(() => {
  clearGuestShelf();
  leaveGuestShelfMode();
});

beforeEach(() => {
  navigation.push.mockClear();
  navigation.refresh.mockClear();
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
  // jsdom 에 없다. 토스트의 되돌리기가 보이는 파우치 버튼을 찾을 때 쓴다.
  HTMLElement.prototype.checkVisibility = () => true;
});

describe("서버에서 받은 위시리스트·파우치 담김 상태(#836)", () => {
  it("서버 HTML부터 담김을 표시하고 마운트 때 추가 조회하지 않는다", async () => {
    const initial: WishlistShelfState = { status: "ready", wishlisted: true, shelved: true };
    const markup = renderToString(view(initial));
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(markup.match(/파우치에 저장됨/g)).toHaveLength(1);

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
    expect(await screen.findByText("위시리스트에서 빼지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("추가하지 못하면 추가에 실패했다고 알린다", async () => {
    server.use(
      http.put("*/api/users/me/wishlist/products/1", () =>
        HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 }),
      ),
    );
    render(view({ status: "ready", wishlisted: false, shelved: false }));
    await userEvent.click(wishlistButton());
    expect(await screen.findByText("위시리스트에 추가하지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "false");
  });

  describe("파우치에서 빼면", () => {
    const shelfItem = {
      product: { id: 1, name: "제품", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: true },
      usageStatus: "USED",
      rating: { preference: "BAD", moistureLevel: 0.5, oilLevel: null },
      possiblyUnsuitable: false,
      registeredAt: "2026-11-05T09:00:00+09:00",
    };
    const removeFromShelf = async () => {
      await userEvent.click(screen.getByRole("button", { name: "파우치에 저장됨" }));
      const sheet = await screen.findByRole("dialog");
      await userEvent.click(within(sheet).getByRole("button", { name: "빼기" }));
    };

    it("제품명과 되돌리기를 띄우고, 되돌리면 같은 사용 상태와 평가로 다시 담는다", async () => {
      const added: unknown[] = [];
      server.use(
        http.get("*/api/users/me/shelf/products", () => HttpResponse.json({ usages: [], items: [shelfItem] })),
        http.delete("*/api/users/me/shelf/products/1", () => new HttpResponse(null, { status: 204 })),
        http.post("*/api/users/me/shelf/products", async ({ request }) => {
          added.push(await request.json());
          return HttpResponse.json(shelfItem, { status: 201 });
        }),
      );
      render(view({ status: "ready", wishlisted: false, shelved: true }));

      await removeFromShelf();
      expect(await screen.findByText("제품을 파우치에서 뺐어요")).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: "파우치에 저장" })).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));
      expect(await screen.findByRole("button", { name: "파우치에 저장됨" })).toBeInTheDocument();
      expect(added).toEqual([
        { productId: 1, usageStatus: "USED", preference: "BAD", moistureLevel: 0.5, oilLevel: null },
      ]);
    });

    it("로그인 전이면 비로그인 파우치에 같은 평가와 담은 시각으로 되돌린다", async () => {
      const { product, usageStatus, rating, registeredAt } = shelfItem;
      addGuestShelfProduct(product, { usageStatus, ...rating } as RatingDraft, registeredAt);
      render(view({ status: "signedOut", wishlisted: false, shelved: false }));

      await removeFromShelf();
      expect(await screen.findByText("제품을 파우치에서 뺐어요")).toBeInTheDocument();
      expect(readGuestShelf()).toEqual([]);

      await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));
      expect(await screen.findByRole("button", { name: "파우치에 저장됨" })).toBeInTheDocument();
      expect(readGuestShelf()).toEqual([expect.objectContaining({ registeredAt, usageStatus, rating })]);
    });

    it("평가를 읽지 못하면 빼기는 하되 되돌리기를 두지 않는다", async () => {
      server.use(
        http.get("*/api/users/me/shelf/products", () =>
          HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 }),
        ),
        http.delete("*/api/users/me/shelf/products/1", () => new HttpResponse(null, { status: 204 })),
      );
      render(view({ status: "ready", wishlisted: false, shelved: true }));

      await removeFromShelf();
      expect(await screen.findByText("제품을 파우치에서 뺐어요")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "되돌리기" })).not.toBeInTheDocument();
    });

    it("빼지 못하면 저장된 상태로 두고 알린다", async () => {
      server.use(
        http.get("*/api/users/me/shelf/products", () => HttpResponse.json({ usages: [], items: [shelfItem] })),
        http.delete("*/api/users/me/shelf/products/1", () =>
          HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 }),
        ),
      );
      render(view({ status: "ready", wishlisted: false, shelved: true }));

      await removeFromShelf();
      expect(await screen.findByText("파우치에서 빼지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "파우치에 저장됨" })).toBeInTheDocument();
    });
  });

  it("서버가 그린 새 회원 상태로 바꾼다", () => {
    const { rerender } = render(view({ status: "ready", wishlisted: true, shelved: false }));
    rerender(view({ status: "ready", wishlisted: false, shelved: true }));
    expect(wishlistButton()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "파우치에 저장됨" })).toBeInTheDocument();
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

describe("위시리스트 하트(시안 v2 V1-b)", () => {
  const risingHearts = () => document.querySelectorAll(".heart-rise");

  // 앞선 시험이 들어간 비로그인 파우치 모드가 남아 있으면 회원이어도 로그인 전으로 보인다.
  beforeEach(() => leaveGuestShelfMode());

  it("담으면 작은 하트 네 개가 떠오른다", async () => {
    // 응답을 받으면 화면을 새로 받아 시험의 초기 상태로 돌아가므로, 바로 바꿔 보인 순간을 본다.
    server.use(http.put("*/api/users/me/wishlist/products/1", () => new Promise<never>(() => undefined)));
    render(view({ status: "ready", wishlisted: false, shelved: false }));

    await userEvent.click(wishlistButton());

    expect(wishlistButton()).toHaveAttribute("aria-pressed", "true");
    expect(risingHearts()).toHaveLength(4);
  });

  it("이미 담긴 하트를 빼면 떠오르지 않는다", async () => {
    render(view({ status: "ready", wishlisted: true, shelved: false }));

    await userEvent.click(wishlistButton());

    expect(risingHearts()).toHaveLength(0);
  });

  it("로그인 전에는 담기지 않으므로 떠오르지 않는다", async () => {
    render(view({ status: "signedOut", wishlisted: false, shelved: false }));

    await userEvent.click(wishlistButton());

    expect(risingHearts()).toHaveLength(0);
  });
});

describe("하단 고정 행동 바(S24)", () => {
  it("제품 요약의 버튼 줄이 지나가기 전에는 숨겨 초점과 보조 기술에서 뺀다", () => {
    render(view({ status: "ready", wishlisted: false, shelved: false }, true));

    const bar = screen.getByRole("button", { name: "파우치에 저장", hidden: true }).parentElement;
    expect(bar).toHaveAttribute("inert");
    expect(bar).toHaveClass("motion-safe:translate-y-full");
  });
});
