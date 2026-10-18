/**
 * @vitest-environment jsdom
 */
import type { IngredientListResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientPicker } from "./IngredientPicker";

import { track } from "@/lib/analytics/track";
import { knownExcludeCodes } from "@/lib/domain/exclude-codes";
import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const limonene = {
  id: 1006,
  koreanName: "리모넨",
  englishName: "Limonene",
  skinEffects: [],
  match: { field: "KOREAN_NAME" as const, text: "리모넨", startIndex: 0, endIndexExclusive: 2 },
};
const retinol = { ...limonene, id: 7, koreanName: "레티놀", englishName: "Retinol" };
const retinolGroup = { code: "RETINOIDS", name: "레티놀", ingredientIds: [7, 8] };

const suggestionsAre = (response: IngredientListResponse) =>
  server.use(http.get("*/api/ingredients/suggestions", () => HttpResponse.json(response)));

const renderPicker = (condition: "include" | "exclude", filter: Partial<Filter>, onApply = vi.fn()) => {
  render(
    <ToastProvider>
      <IngredientPicker
        condition={condition}
        filter={{ ...EMPTY_FILTER, ...filter }}
        quickFilters={knownExcludeCodes(excludeCodes)}
        names={new Map([[7, "레티놀"]])}
        onApply={onApply}
        onBack={vi.fn()}
        returnFocus={() => null}
      />
    </ToastProvider>,
  );
  return onApply;
};

describe("IngredientPicker", () => {
  beforeEach(() => vi.mocked(track).mockClear());

  it("고른 것은 추가하기를 눌러야 반영한다", async () => {
    suggestionsAre({ items: [limonene], groups: [] });
    const onApply = renderPicker("include", {});

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "리모");
    await userEvent.click(await screen.findByRole("button", { name: "리모넨 담기", pressed: false }));

    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ includeIngredientIds: [1006] }));
  });

  it("피하는 성분군에 든 성분을 원하는 성분으로 담으면 먼저 묻는다(S33)", async () => {
    suggestionsAre({ items: [limonene], groups: [] });
    const onApply = renderPicker("include", { excludeCodes: ["FRAGRANCE_ALLERGENS"] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "리모");
    expect(await screen.findByText(/그 성분군을 계속 피할지 먼저 물어봐요/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "리모넨 담기" }));

    expect(await screen.findByRole("dialog", { name: "‘향료/알레르기 성분’ 피하기를 풀까요?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "풀고 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ includeIngredientIds: [1006], excludeCodes: [] }));
  });

  it("성분군을 담으면 따로 담은 성분을 하나로 묶고 알린다(S34)", async () => {
    suggestionsAre({ items: [retinol], groups: [retinolGroup] });
    renderPicker("exclude", { excludeIngredientIds: [7] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "레티");
    await userEvent.click(await screen.findByRole("button", { name: "레티놀 담기", pressed: false }));

    expect(await screen.findByText("레티놀은 ‘레티놀’에 들어 있어서 하나로 묶었어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "레티놀, 담은 성분군에 이미 들어 있음" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("맞는 성분이 없으면 검색어를 인용해 알린다", async () => {
    suggestionsAre({ items: [], groups: [] });
    renderPicker("include", {});

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "판테롤");

    expect(await screen.findByText("‘판테롤’과 맞는 성분이 없어요")).toBeInTheDocument();
  });
});
