/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientSearchScreen, IngredientSearchScreenFallback } from "./IngredientSearchScreen";

import { track } from "@/lib/analytics/track";
import { addMyFilterIngredients } from "@/lib/api/my-filter";
import { readRecentFilters } from "@/lib/storage/recent-filters";
import { excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";
import { resetMockShelf } from "@/mocks/shelf-handlers";

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => searchParams.current,
}));

/** 입력이 멈춘 뒤 검색하므로, 바쁜 CI 에서도 결과를 기다릴 만큼 넉넉히 둔다. */
const WAIT = { timeout: 5000 };

vi.setConfig({ testTimeout: 20_000 });

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

/** 조건에 걸린 제품 수를 정해 둔다. */
const countIs = (count: number) => server.use(http.get("*/api/products/count", () => HttpResponse.json({ count })));

const renderScreen = () =>
  render(
    <ToastProvider>
      <IngredientSearchScreen excludeCodes={excludeCodes} />
    </ToastProvider>,
  );

describe("IngredientSearchScreen", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
    vi.mocked(track).mockClear();
    push.mockClear();
    resetMockShelf();
  });

  it("성분 조건이 없어도 나만의 필터가 적용되면 결과를 볼 수 있고, 최근 필터에는 남기지 않는다", async () => {
    await addMyFilterIngredients([9001]);
    countIs(80);
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "80개 제품 보기" }, WAIT));

    expect(push).toHaveBeenCalledWith("/products");
    expect(readRecentFilters()).toEqual([]);
    expect(screen.queryByRole("button", { name: "초기화" })).not.toBeInTheDocument();
  });

  it("조건이 없으면 큰 추가 버튼을 두고 하단 버튼을 막는다", () => {
    countIs(120);
    renderScreen();

    expect(screen.getByRole("button", { name: "원하는 성분 검색해서 추가" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "피하고 싶은 성분 검색해서 추가" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "조건을 골라 주세요" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "초기화" })).not.toBeInTheDocument();
  });

  it("조건이 걸리면 개수를 버튼에 보여 주고, 누르면 결과 목록으로 간다", async () => {
    countIs(7);
    searchParams.current = new URLSearchParams(
      "includeIngredientIds=6&excludeIngredientIds=8&excludeCodes=DRYING_ALCOHOLS",
    );
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "7개 제품 보기" }, WAIT));

    expect(track).toHaveBeenCalledWith("search_submitted", {
      mode: "ingredient",
      result_count: 7,
      include_count: 1,
      exclude_count: 1,
      exclude_group_count: 1,
    });
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/products?"));
  });

  it("맞는 제품이 없으면 0개로 막고 결과 없음을 한 번 남긴다", async () => {
    countIs(0);
    searchParams.current = new URLSearchParams("includeIngredientIds=6");
    renderScreen();

    const button = await screen.findByRole("button", { name: "0개 제품 보기" }, WAIT);
    expect(button).toHaveAttribute("aria-disabled", "true");
    await waitFor(
      () => expect(track).toHaveBeenCalledWith("search_results_viewed", expect.objectContaining({ result_count: 0 })),
      WAIT,
    );
  });

  it("자주 피하는 성분을 켜고 끈다", async () => {
    countIs(3);
    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "건조 알코올", pressed: false }));

    expect(track).toHaveBeenCalledWith("ingredient_condition_toggled", {
      target_type: "exclude_group",
      exclude_code: "DRYING_ALCOHOLS",
      condition: "exclude",
      action: "add",
      surface: "ingredient_search",
    });
    expect(window.location.search).toContain("excludeCodes=DRYING_ALCOHOLS");
  });

  it("원하는 성분이 든 자주 피하는 성분을 켜면 바로 빼고 안내 줄로 알린다(S35)", async () => {
    countIs(3);
    // 1006 은 향료/알레르기 성분에 든 리모넨이다.
    searchParams.current = new URLSearchParams("includeIngredientIds=1006");
    renderScreen();

    const chip = screen.getByRole("button", { name: "향료/알레르기 성분", pressed: false });
    await userEvent.click(chip);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByText(/‘향료\/알레르기 성분’에 들어 있어 원하는 성분에서 뺐어요\./, {}, WAIT),
    ).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("filter_conflict_shown", { conflict_count: 1, ingredient_count: 1 });
    expect(window.location.search).toContain("excludeCodes=FRAGRANCE_ALLERGENS");
    expect(window.location.search).not.toContain("includeIngredientIds");
    // 초점은 누른 칩에 그대로 둔다.
    expect(chip).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    await waitFor(() => expect(window.location.search).toContain("includeIngredientIds=1006"));
    expect(window.location.search).not.toContain("excludeCodes");
    expect(screen.queryByText(/원하는 성분에서 뺐어요/)).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });

  it("주소에 add 가 있으면 성분 추가 화면을 덮어 연다", async () => {
    countIs(3);
    searchParams.current = new URLSearchParams("add=exclude");
    renderScreen();

    expect(await screen.findByRole("dialog", { name: "피하고 싶은 성분 추가" }, WAIT)).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "성분 검색" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "추가하기" })).toHaveAttribute("aria-disabled", "true");
  });

  it("ⓘ 를 누르면 자주 피하는 성분 설명 시트를 연다", async () => {
    countIs(3);
    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "자주 피하는 성분 설명" }));

    expect(await screen.findByRole("dialog", { name: "자주 피하는 성분이란?" }, WAIT)).toHaveTextContent(
      "예: 리모넨 · 리날룰",
    );
  });

  it("초기화하면 성분 조건을 모두 비운다", async () => {
    countIs(3);
    searchParams.current = new URLSearchParams("includeIngredientIds=6&excludeCodes=SULFATES");
    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "초기화" }));

    expect(track).toHaveBeenCalledWith("filter_reset", { filter_type: "ingredient" });
    expect(window.location.search).toBe("");
  });
});

describe("IngredientSearchScreenFallback", () => {
  it("주소를 읽지 않고 조건 없는 모양을 그린다", () => {
    render(<IngredientSearchScreenFallback excludeCodes={excludeCodes} />);

    expect(screen.getByRole("button", { name: "원하는 성분 검색해서 추가" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(excludeCodes.length);
  });
});
