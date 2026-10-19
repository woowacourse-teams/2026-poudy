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

/** 입력이 멈춘 뒤 검색하므로, 바쁜 CI 에서도 결과를 기다릴 만큼 넉넉히 둔다. */
const WAIT = { timeout: 5000 };

vi.setConfig({ testTimeout: 20_000 });

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
    await userEvent.click(await screen.findByRole("button", { name: "리모넨 담기", pressed: false }, WAIT));

    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ includeIngredientIds: [1006] }));
  });

  it("피하는 성분군에 든 성분을 원하는 성분으로 담으면 먼저 묻는다(S33)", async () => {
    suggestionsAre({ items: [limonene], groups: [] });
    const onApply = renderPicker("include", { excludeCodes: ["FRAGRANCE_ALLERGENS"] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "리모");
    expect(await screen.findByText(/그 성분군을 계속 피할지 먼저 물어봐요/, {}, WAIT)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "리모넨 담기" }));

    expect(
      await screen.findByRole("dialog", { name: "‘향료/알레르기 성분’ 피하기를 풀까요?" }, WAIT),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "풀고 추가" }));
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ includeIngredientIds: [1006], excludeCodes: [] }));
  });

  it("성분군을 담으면 따로 담은 성분을 하나로 묶고 알린다(S34)", async () => {
    suggestionsAre({ items: [retinol], groups: [retinolGroup] });
    renderPicker("exclude", { excludeIngredientIds: [7] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "레티");
    // 성분군 행 이름은 조건 일치 제품의 결과 행과 같이 '이름 N종'이다.
    await userEvent.click(await screen.findByRole("button", { name: "레티놀 2종 담기", pressed: false }, WAIT));

    expect(await screen.findByText("레티놀은 ‘레티놀’에 들어 있어서 하나로 묶었어요", {}, WAIT)).toBeInTheDocument();
    // 성분군으로 담긴 성분은 더 누를 수 없는 표시로 바뀐다.
    expect(screen.getByText("레티놀 성분군으로 담김")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "레티놀 담기" })).not.toBeInTheDocument();
  });

  it("원하는 성분이 든 성분군을 피하려 하면 함께 뺄지 묻는다", async () => {
    suggestionsAre({ items: [], groups: [retinolGroup] });
    const onApply = renderPicker("exclude", { includeIngredientIds: [7] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "레티");
    await userEvent.click(await screen.findByRole("button", { name: "레티놀 2종 담기" }, WAIT));

    expect(await screen.findByRole("dialog", { name: "레티놀을 원하는 성분에서 뺄까요?" }, WAIT)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "빼고 적용" }));
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ includeIngredientIds: [], excludeGroupCodes: ["RETINOIDS"] }),
    );
  });

  it("맞는 성분이 없으면 검색어를 인용해 알린다", async () => {
    suggestionsAre({ items: [], groups: [] });
    renderPicker("include", {});

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "판테롤");

    expect(await screen.findByText("‘판테롤’과 맞는 성분이 없어요", {}, WAIT)).toBeInTheDocument();
  });
});
