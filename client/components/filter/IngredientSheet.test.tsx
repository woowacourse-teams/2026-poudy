/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { FilterSheets } from "./FilterSheets";

import { track } from "@/lib/analytics/track";
import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { VISIBLE_TEXT } from "@/lib/test/visible-text";
import { excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

/** 입력이 멈춘 뒤 검색하므로, 바쁜 CI 에서도 결과를 기다릴 만큼 넉넉히 둔다. */
const WAIT = { timeout: 5000 };

vi.setConfig({ testTimeout: 20_000 });

const retinol = {
  id: 7,
  koreanName: "레티놀",
  englishName: "Retinol",
  skinEffects: [],
  match: { field: "KOREAN_NAME" as const, text: "레티", startIndex: 0, endIndexExclusive: 2 },
};

const renderSheet = (filter: Partial<Filter>) => {
  server.use(http.get("*/api/products/count", () => HttpResponse.json({ count: 3 })));
  const onApply = vi.fn();
  render(
    <FilterSheets
      openSheet="ingredient"
      filter={{ ...EMPTY_FILTER, ...filter }}
      onApply={onApply}
      onClose={vi.fn()}
      excludeCodes={excludeCodes}
      categories={[]}
      brands={[]}
      skinTypes={[]}
    />,
  );
  return { sheet: within(screen.getByRole("dialog")), onApply };
};

describe("성분 시트의 초기화", () => {
  it("비울 성분 조건이 없으면 초기화를 막고, 하나라도 담으면 풀린다(S23i)", async () => {
    const { sheet } = renderSheet({});

    expect(sheet.getByRole("button", { name: "초기화" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(sheet.getByRole("button", { name: "건조 알코올", pressed: false }));
    expect(sheet.getByRole("button", { name: "초기화" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("성분 시트의 조건 충돌", () => {
  it("원하는 성분이 든 자주 피하는 성분을 켜면 바로 빼고 되돌릴 수 있다(S35a)", async () => {
    // 1006 은 향료/알레르기 성분에 든 리모넨이다.
    const { sheet } = renderSheet({ includeIngredientIds: [1006] });

    const chip = sheet.getByRole("button", { name: "향료/알레르기 성분", pressed: false });
    await userEvent.click(chip);

    expect(
      sheet.getByText(/‘향료\/알레르기 성분’에 들어 있어 원하는 성분에서 뺐어요\./, VISIBLE_TEXT),
    ).toBeInTheDocument();
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveFocus();
    expect(sheet.getByRole("button", { name: "원하는 성분 검색해서 추가" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("filter_conflict_shown", { conflict_count: 1, ingredient_count: 1 });

    await userEvent.click(sheet.getByRole("button", { name: "되돌리기" }));

    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip).toHaveFocus();
    expect(sheet.queryByText(/원하는 성분에서 뺐어요/)).not.toBeInTheDocument();
    expect(sheet.queryByRole("button", { name: "원하는 성분 검색해서 추가" })).not.toBeInTheDocument();
  });

  it("안내 줄은 다음 편집에서 닫힌다", async () => {
    const { sheet } = renderSheet({ includeIngredientIds: [1006] });

    await userEvent.click(sheet.getByRole("button", { name: "향료/알레르기 성분", pressed: false }));
    await userEvent.click(sheet.getByRole("button", { name: "건조 알코올", pressed: false }));

    expect(sheet.queryByText(/원하는 성분에서 뺐어요/)).not.toBeInTheDocument();
  });

  it("원하는 성분에 담긴 성분을 피하고 싶은 성분으로 담으면 옮겨 오고 알린다(S33a)", async () => {
    server.use(http.get("*/api/ingredients/suggestions", () => HttpResponse.json({ items: [retinol], groups: [] })));
    const { sheet, onApply } = renderSheet({ includeIngredientIds: [7], excludeIngredientIds: [8] });

    await userEvent.click(sheet.getByRole("button", { name: "피하고 싶은 성분 추가" }));
    await userEvent.type(sheet.getByRole("searchbox", { name: "성분명 검색" }), "레티");
    // 반대쪽에 있어도 막지 않고 + 로 담을 수 있다.
    await userEvent.click(await sheet.findByRole("button", { name: "레티놀 담기", pressed: false }, WAIT));

    expect(sheet.getByText("레티놀을 원하는 성분에서 빼고 피하고 싶은 성분에 담았어요.")).toBeInTheDocument();
    // 결과는 탐색 조건의 성분 추가 화면처럼 '성분 N' 묶음으로 나눈다.
    expect(sheet.getByRole("region", { name: "성분 1개" })).toBeInTheDocument();
    await userEvent.click(sheet.getByRole("button", { name: "1개 추가하기" }));

    // 편집 화면으로 돌아와 원하는 성분은 비고, 적용하면 옮겨 온 대로 반영한다.
    expect(sheet.getByRole("button", { name: "원하는 성분 검색해서 추가" })).toBeInTheDocument();
    await waitFor(() => expect(sheet.getByRole("button", { name: /제품 보기/ })).toBeEnabled());
    await userEvent.click(sheet.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ includeIngredientIds: [], excludeIngredientIds: [8, 7] }),
    );
  });
});
