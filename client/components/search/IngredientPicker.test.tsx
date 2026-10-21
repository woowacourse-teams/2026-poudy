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
import { VISIBLE_TEXT } from "@/lib/test/visible-text";
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
  formulationRoles: [],
  skinEffects: [],
  excludeGroups: [{ code: "FRAGRANCE_ALLERGENS", name: "향료/알레르기 성분" }],
  match: { field: "KOREAN_NAME" as const, text: "리모넨", startIndex: 0, endIndexExclusive: 2 },
};
const retinol = { ...limonene, id: 7, koreanName: "레티놀", englishName: "Retinol", excludeGroups: [] };
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
        returnFocus={{ current: null }}
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

  it("결과 행에 제형 기능과 주의 성분군, 피부 작용을 나만의 필터 행처럼 보여 준다", async () => {
    suggestionsAre({
      items: [
        {
          ...limonene,
          formulationRoles: [{ id: "role-1", code: "PERFUMING", name: "착향제" }],
          skinEffects: [{ id: "effect-1", code: "SOOTHING_RELATED", name: "피부 진정 관련" }],
        },
      ],
      groups: [],
    });
    renderPicker("include", {});

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "리모");
    const row = (await screen.findByRole("button", { name: "리모넨 담기" }, WAIT)).parentElement;

    expect(row).toHaveTextContent("착향제");
    expect(row).toHaveTextContent("향료/알레르기 성분, 진정");
    // 아래 줄은 영문명 대신 제형 기능을 적는다.
    expect(row).not.toHaveTextContent("Limonene");
  });

  it("피하는 성분군에 든 성분을 원하는 성분으로 담으면 성분군 피하기를 바로 풀고 알린다(S33)", async () => {
    suggestionsAre({ items: [limonene], groups: [] });
    const onApply = renderPicker("include", { excludeCodes: ["FRAGRANCE_ALLERGENS"] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "리모");
    await userEvent.click(await screen.findByRole("button", { name: "리모넨 담기" }, WAIT));

    expect(screen.queryByRole("dialog", { name: /피하기를 풀까요/ })).not.toBeInTheDocument();
    expect(screen.getByText("리모넨을 담으려고 ‘향료/알레르기 성분’ 피하기를 풀었어요.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("filter_conflict_shown", { conflict_count: 1, ingredient_count: 1 });
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ includeIngredientIds: [1006], excludeCodes: [] }));
  });

  it("되돌리기를 누르면 정리하기 전으로 돌린다", async () => {
    suggestionsAre({ items: [limonene], groups: [] });
    renderPicker("include", { excludeCodes: ["FRAGRANCE_ALLERGENS"] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "리모");
    const add = await screen.findByRole("button", { name: "리모넨 담기" }, WAIT);
    await userEvent.click(add);
    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(screen.getByRole("button", { name: "리모넨 담기", pressed: false })).toBe(add);
    expect(add).toHaveFocus();
    expect(screen.queryByText(/피하기를 풀었어요/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "추가하기" })).toHaveAttribute("aria-disabled", "true");
  });

  it("원하는 성분에 담긴 성분을 피하고 싶은 성분으로 담으면 옮겨 오고 알린다(S33a)", async () => {
    suggestionsAre({ items: [retinol], groups: [] });
    const onApply = renderPicker("exclude", { includeIngredientIds: [7] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "레티");
    await userEvent.click(await screen.findByRole("button", { name: "레티놀 담기", pressed: false }, WAIT));

    expect(screen.getByText("레티놀을 원하는 성분에서 빼고 피하고 싶은 성분에 담았어요.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "1개 추가하기" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ includeIngredientIds: [], excludeIngredientIds: [7] }),
    );
  });

  it("성분군을 담으면 따로 담은 성분을 하나로 묶고 알린다(S34)", async () => {
    suggestionsAre({ items: [retinol], groups: [retinolGroup] });
    renderPicker("exclude", { excludeIngredientIds: [7] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "레티");
    // 성분군 행 이름은 조건 일치 제품의 결과 행과 같이 '이름 N종'이다.
    await userEvent.click(await screen.findByRole("button", { name: "레티놀 2종 담기", pressed: false }, WAIT));

    expect(
      await screen.findByText("레티놀은 ‘레티놀’에 들어 있어서 하나로 묶었어요", VISIBLE_TEXT, WAIT),
    ).toBeInTheDocument();
    // 성분군으로 담긴 성분은 더 누를 수 없는 표시로 바뀐다.
    expect(screen.getByText("레티놀 성분군으로 담김")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "레티놀 담기" })).not.toBeInTheDocument();
  });

  it("원하는 성분이 든 성분군을 피하면 원하는 성분에서 바로 빼고 알린다", async () => {
    suggestionsAre({ items: [], groups: [retinolGroup] });
    const onApply = renderPicker("exclude", { includeIngredientIds: [7] });

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "레티");
    await userEvent.click(await screen.findByRole("button", { name: "레티놀 2종 담기" }, WAIT));

    expect(screen.getByText("레티놀은 ‘레티놀’에 들어 있어 원하는 성분에서 뺐어요.", VISIBLE_TEXT)).toBeInTheDocument();
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
