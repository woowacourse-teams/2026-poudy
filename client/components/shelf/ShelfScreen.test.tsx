/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShelfFilterScreen } from "./ShelfFilterScreen";
import { ShelfScreen } from "./ShelfScreen";

import { server } from "@/mocks/server";
import { resetMockShelf } from "@/mocks/shelf-handlers";

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push, replace }),
  usePathname: () => "/shelf",
}));

const SHELF_PATH = "*/api/users/me/shelf";

afterEach(() => {
  resetMockShelf();
  push.mockReset();
});

describe("선반", () => {
  it("안 맞을 수 있는 성분과 사용 상태별 제품을 보여 준다", async () => {
    render(<ShelfScreen />);

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(
      within(card)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["리모넨", "향료", "페녹시에탄올"]);
    expect(within(card).getByRole("button", { name: "검색에서 제외할 성분 고르기" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /피부 타입을 알려 주면/ })).toHaveAttribute(
      "href",
      "/my-page/skin-type",
    );
    expect(screen.getByRole("heading", { name: "사용 중 · 3" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "사용했던 · 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /평가하기$/ })).toHaveLength(1);
  });

  it("검색에서 제외 중인 성분이 있으면 관리 줄이 나만의 필터로 이어진다", async () => {
    server.use(
      http.get("*/api/users/me/skin-filter", () =>
        HttpResponse.json({
          items: [{ id: 9001, koreanName: "리모넨", formulationRoles: [], skinEffects: [], groupCodes: [] }],
        }),
      ),
    );
    render(<ShelfScreen />);

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(await within(card).findByRole("link", { name: /관리하기/ })).toHaveAttribute("href", "/my-page/filter");
  });

  it("평가 시트의 수분감·유분감은 '선택 전'으로 시작하고, 고른 값만 보낸다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.put(`${SHELF_PATH}/products/:productId`, async ({ request }) => {
        // 값만 적어 두고 응답은 목 처리기에 넘긴다(undefined 를 돌려주면 다음 처리기가 받는다).
        sent(await request.clone().json());
        return undefined;
      }),
    );
    render(<ShelfScreen />);

    const [rate] = await screen.findAllByRole("button", { name: /평가하기$/ });
    await user.click(rate);
    const moisture = await screen.findByRole("slider", { name: "수분감" });
    const oil = screen.getByRole("slider", { name: "유분감" });
    expect(moisture).toHaveAttribute("aria-valuetext", "선택 전");
    expect(moisture).not.toHaveAttribute("aria-valuenow");
    expect(oil).toHaveAttribute("aria-valuetext", "선택 전");

    moisture.focus();
    await user.keyboard("{End}");
    expect(moisture).toHaveAttribute("aria-valuenow", "3");
    expect(oil).toHaveAttribute("aria-valuetext", "선택 전");

    await user.click(screen.getByRole("button", { name: "평가 저장" }));
    await waitFor(() => expect(sent).toHaveBeenCalled());
    expect(sent).toHaveBeenCalledWith(expect.objectContaining({ moistureLevel: 3, oilLevel: null }));
  });

  it("보기 칩을 고르면 그 사용 상태의 제품만 머리 없이 보여 준다", async () => {
    const user = userEvent.setup();
    render(<ShelfScreen />);

    await user.click(await screen.findByRole("button", { name: "사용했던 2" }));

    expect(screen.getByRole("button", { name: "사용했던 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2개")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /사용 중 ·/ })).not.toBeInTheDocument();
  });

  it("제품 메뉴에서 선반에서 빼면 확인한 뒤 목록에서 사라진다", async () => {
    const user = userEvent.setup();
    render(<ShelfScreen />);

    const [firstMenu] = await screen.findAllByRole("button", { name: /메뉴$/ });
    const name = firstMenu.getAttribute("aria-label")?.replace(/ 메뉴$/, "") ?? "";
    await user.click(firstMenu);
    await user.click(screen.getByRole("button", { name: "선반에서 빼기" }));
    expect(screen.getByRole("heading", { name: /선반에서 뺄까요\?/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "빼기" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: `${name} 메뉴` })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "전체 4" })).toBeInTheDocument();
  });

  it("로그인하지 않았으면 선반 소개와 로그인 버튼을 보여 준다", async () => {
    server.use(
      http.get(`${SHELF_PATH}/products`, () =>
        HttpResponse.json({ code: "UNAUTHORIZED", status: 401, title: "UNAUTHORIZED" }, { status: 401 }),
      ),
    );
    render(<ShelfScreen />);

    expect(await screen.findByRole("button", { name: "로그인하고 시작하기" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "자세히 보기" })).toHaveAttribute("href", "/shelf/guide");
  });

  it("선반이 비었으면 선반 소개와 제품 추가 버튼을 보여 준다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${SHELF_PATH}/products`, () =>
        HttpResponse.json({
          usages: [
            { code: "ALL", name: "전체", count: 0 },
            { code: "IN_USE", name: "사용 중", count: 0 },
            { code: "USED", name: "사용했던", count: 0 },
          ],
          items: [],
        }),
      ),
    );
    render(<ShelfScreen />);

    await user.click(await screen.findByRole("button", { name: "제품 추가하기" }));
    expect(push).toHaveBeenCalledWith("/shelf/add");
  });
});

describe("검색에서 제외할 성분 고르기", () => {
  it("처음에는 결과 성분을 모두 골라 두고, 고른 성분만 나만의 필터에 넣는다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.post("*/api/users/me/skin-filter/ingredients", async ({ request }) => {
        sent(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<ShelfFilterScreen />);

    await user.click(await screen.findByRole("checkbox", { name: /향료/ }));
    await user.click(screen.getByRole("button", { name: "성분 2개 제외하기" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/shelf"));
    expect(sent).toHaveBeenCalledWith({ ingredientIds: [9001, 9003] });
  });
});
