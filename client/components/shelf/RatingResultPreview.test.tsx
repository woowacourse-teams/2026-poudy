/** @vitest-environment jsdom */
import type {
  IngredientAnalysisItemResponse,
  IngredientAnalysisPreviewResponse,
  IngredientAnalysisReason,
  IngredientAnalysisResponse,
  RatingPreference,
} from "@poudy/api/api.zod";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RatingResultPreview } from "./RatingResultPreview";

const ingredient = (id: number, name: string, productCount: number): IngredientAnalysisItemResponse => ({
  id,
  koreanName: name,
  formulationRoles: [],
  groupCodes: [],
  reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
  products: Array.from({ length: productCount }, (_, index) => ({
    id: index + 1,
    name: `제품 ${index}`,
    imageUrl: "",
  })),
  inFilter: false,
  isNew: false,
});

const withReasons = (
  item: IngredientAnalysisItemResponse,
  reasons: readonly IngredientAnalysisReason[],
): IngredientAnalysisItemResponse => ({ ...item, reasons: reasons.map((code) => ({ code, name: `${code} 후보` })) });

const analysis = (
  badProductCount: number,
  items: readonly IngredientAnalysisItemResponse[],
): IngredientAnalysisResponse => ({ badProductCount, items: [...items] });

const PREVIEW: IngredientAnalysisPreviewResponse = {
  withoutRating: analysis(1, [ingredient(1, "리모넨", 1), ingredient(2, "향료", 1)]),
  ratedGood: analysis(1, [ingredient(2, "향료", 1)]),
  ratedBad: analysis(2, [ingredient(1, "리모넨", 2), ingredient(2, "향료", 1), ingredient(3, "알코올", 1)]),
  ratedBadAcrossSkinTypes: null,
  productCautionIngredients: [
    { id: 1, koreanName: "리모넨", reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }] },
  ],
};

const EMPTY_PREVIEW: IngredientAnalysisPreviewResponse = {
  ...PREVIEW,
  withoutRating: analysis(0, []),
  ratedGood: analysis(0, []),
  ratedBad: analysis(1, [withReasons(ingredient(1, "리모넨", 1), ["QUICK_EXCLUDE", "SENSITIVE_SKIN"])]),
};

const view = (
  preference: RatingPreference | null,
  preview: IngredientAnalysisPreviewResponse = PREVIEW,
  guest = false,
) => <RatingResultPreview preview={preview} preference={preference} guest={guest} />;

const chip = (name: string) => screen.getAllByText(name)[0]?.closest("li");

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const mockReducedMotion = (reduced: boolean) => {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: reduced })) });
};

beforeEach(() => {
  vi.useFakeTimers();
  mockReducedMotion(false);
  Element.prototype.animate = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RatingResultPreview", () => {
  it("평가를 고르지 않았으면 지금 결과와 기준 제품 수를 보여 준다", () => {
    render(view(null));

    expect(screen.getByText("지금 결과 · 안 맞은 제품 1개 기준")).toBeInTheDocument();
    expect(chip("리모넨")).toHaveAttribute("data-phase", "stay");
    expect(chip("향료")).toHaveTextContent("1개");
  });

  it("안 맞았어요를 고르면 새 성분이 나타나고 개수가 바뀐 성분은 커진다", () => {
    const { rerender } = render(view(null));

    rerender(view("BAD"));

    expect(screen.getByText(/이 제품에 든 성분이 더해져요/)).toHaveTextContent(
      "안 맞은 제품 2개 기준 · 이 제품에 든 성분이 더해져요",
    );
    expect(chip("알코올")).toHaveAttribute("data-phase", "enter");
    expect(chip("알코올")).toHaveClass("bg-danger-soft");
    expect(chip("리모넨")).toHaveAttribute("data-phase", "bump");
    expect(chip("리모넨")).toHaveTextContent("1개");
    advance(300);
    expect(chip("리모넨")).toHaveTextContent("2개");
    expect(Element.prototype.animate).toHaveBeenCalled();
  });

  it("잘 맞았어요를 고르면 빠지는 성분에 취소선을 긋고, 움직임이 끝나면 지운다", () => {
    const { rerender } = render(view(null));

    rerender(view("GOOD"));

    expect(chip("리모넨")).toHaveAttribute("data-phase", "leave");
    expect(chip("리모넨")).toHaveClass("line-through");
    advance(1000);
    expect(screen.queryByText("리모넨")).not.toBeInTheDocument();
    expect(chip("향료")).toBeInTheDocument();
  });

  it.each([true, false])("잘 맞았어요에서는 피부 분류 없이 중복 성분을 하나씩 표시한다 (guest=%s)", (guest) => {
    const limonene = withReasons(ingredient(1, "리모넨", 1), ["QUICK_EXCLUDE", "SENSITIVE_SKIN"]);
    const fragrance = withReasons(ingredient(2, "향료", 1), ["DRY_SKIN", "SENSITIVE_SKIN"]);
    const preview = {
      ...PREVIEW,
      withoutRating: analysis(1, [limonene, fragrance]),
      ratedGood: analysis(1, [fragrance]),
    };
    const { rerender } = render(view(null, preview, guest));
    rerender(view("GOOD", preview, guest));
    expect(screen.queryByText("DRY_SKIN 후보")).not.toBeInTheDocument();
    expect(screen.queryByText("SENSITIVE_SKIN 후보")).not.toBeInTheDocument();
    expect(screen.queryByText("QUICK_EXCLUDE 후보")).not.toBeInTheDocument();
    expect(screen.getAllByText("리모넨")).toHaveLength(1);
    expect(screen.getAllByText("향료")).toHaveLength(1);
    expect(chip("리모넨")).toHaveClass("line-through");
    advance(1000);
    expect(screen.queryByText("리모넨")).not.toBeInTheDocument();
    expect(chip("향료")).toBeInTheDocument();
    rerender(view("BAD", preview, guest));
    expect(screen.getByText("빠른 제외 성분")).toBeInTheDocument();
  });

  it("선택을 풀면 움직임 없이 지금 결과로 돌아가고 새 성분 표시가 남지 않는다", () => {
    const { rerender } = render(view("BAD"));

    rerender(view(null));

    expect(chip("리모넨")).toHaveAttribute("data-phase", "stay");
    expect(screen.queryByText("알코올")).not.toBeInTheDocument();
  });

  it("잘 맞았어요에서 안 맞았어요로 바꾸면 지금 결과로 되돌린 뒤 바뀐 부분만 움직인다", () => {
    const { rerender } = render(view("GOOD"));

    rerender(view("BAD"));

    expect(chip("리모넨")).toHaveAttribute("data-phase", "bump");
    expect(chip("향료")).toHaveAttribute("data-phase", "stay");
    expect(chip("알코올")).toHaveAttribute("data-phase", "enter");
  });

  it("잘 맞았어요로 빠질 후보가 없으면 처음부터 초록 영역에 성분을 표시한다", () => {
    const { rerender } = render(view(null, EMPTY_PREVIEW));

    rerender(view("GOOD", EMPTY_PREVIEW));

    expect(screen.getByRole("heading", { name: "잘 맞은 제품의 성분" })).toBeInTheDocument();
    expect(screen.queryByText("잘 맞은 제품에도 든 성분은 후보에서 빠져요")).not.toBeInTheDocument();
    const kept = screen.getByText("나에게 괜찮았던 성분").parentElement!;
    expect(kept).toHaveTextContent("리모넨");
    expect(kept.querySelector("li")).toHaveClass("bg-success-soft", "text-success-text");
    expect(screen.getAllByText("리모넨")).toHaveLength(1);
    advance(600);
    expect(kept).toHaveTextContent("리모넨");
  });

  it("초록 박스가 먼저 펼쳐진 뒤 성분이 하나씩 나타나며 기존 종료 시각을 유지한다", () => {
    const preview = {
      ...EMPTY_PREVIEW,
      productCautionIngredients: [
        { id: 1, koreanName: "첫 성분", reasons: [{ code: "QUICK_EXCLUDE" as const, name: "빠른 제외 성분" }] },
        { id: 2, koreanName: "둘째 성분", reasons: [{ code: "QUICK_EXCLUDE" as const, name: "빠른 제외 성분" }] },
      ],
    };
    render(view("GOOD", preview, true));
    expect(Element.prototype.animate).toHaveBeenNthCalledWith(
      1,
      [expect.objectContaining({ clipPath: expect.stringContaining("100%") }), expect.any(Object)],
      expect.objectContaining({ duration: 250 }),
    );
    expect(Element.prototype.animate).toHaveBeenNthCalledWith(
      2,
      [
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1 },
      ],
      expect.objectContaining({ duration: 350, delay: 650, fill: "backwards" }),
    );
    expect(Element.prototype.animate).toHaveBeenNthCalledWith(
      3,
      [
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1 },
      ],
      expect.objectContaining({ duration: 350, delay: 830, fill: "backwards" }),
    );
    const kept = screen.getByText("나에게 괜찮았던 성분").parentElement!;
    expect(kept).toHaveTextContent("첫 성분");
    expect(kept).toHaveTextContent("둘째 성분");
    expect(kept.querySelectorAll("li.bg-success-soft")).toHaveLength(2);
  });

  it("움직임 줄이기에서는 괜찮았던 성분을 기다리지 않고 바로 표시한다", () => {
    mockReducedMotion(true);
    render(view("GOOD", EMPTY_PREVIEW, true));
    expect(Element.prototype.animate).not.toHaveBeenCalled();
    expect(screen.getByText("나에게 괜찮았던 성분").parentElement).toHaveTextContent("리모넨");
  });

  it("비로그인이 안 맞았어요를 고르면 전체 타입의 주의 성분임을 안내한다", () => {
    const { rerender } = render(view(null, EMPTY_PREVIEW, true));

    rerender(view("BAD", EMPTY_PREVIEW, true));
    advance(3000);

    expect(
      screen.getByText(/지금은 모든 타입의 주의 성분을 보여드려요\. 로그인 후 피부 타입을 선택하면/),
    ).toBeInTheDocument();
    expect(screen.queryByText("예시")).not.toBeInTheDocument();
  });

  it("주의 성분 없는 제품을 평가하면 기존 후보를 유지하고 짧게 변화 없음을 알린다", () => {
    const current = analysis(1, [ingredient(1, "기존 후보", 1)]);
    const preview = {
      ...PREVIEW,
      withoutRating: current,
      ratedBad: { ...current, badProductCount: 2 },
      productCautionIngredients: [],
    };
    const { rerender } = render(view(null, preview, true));
    rerender(view("BAD", preview, true));
    const note = screen.getByText("변경된 게 없어요");
    expect(note).toBeInTheDocument();
    expect(screen.getByText("기존 후보").compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chip("기존 후보")).toHaveAttribute("data-phase", "stay");
    expect(chip("기존 후보")).toHaveTextContent("1개");
    expect(screen.queryByText(/성분이 더해져요/)).not.toBeInTheDocument();
    expect(screen.queryByText(/지금은 모든 타입/)).not.toBeInTheDocument();
    expect(screen.queryByText("안 맞았던 제품에서 주의 성분을 찾지 못했어요.")).not.toBeInTheDocument();
  });

  it("피부 타입 미등록 회원의 기존 피부별 후보는 주의 성분 없는 제품을 평가해도 신규로 표시하지 않는다", () => {
    const quick = ingredient(1, "기존 빠른 제외 성분", 1);
    const skin = withReasons(ingredient(2, "기존 건성 성분", 1), ["DRY_SKIN"]);
    const current = analysis(1, [quick, skin]);
    const preview = {
      ...PREVIEW,
      withoutRating: current,
      ratedGood: current,
      ratedBad: analysis(2, [quick]),
      ratedBadAcrossSkinTypes: { ...current, badProductCount: 2 },
      productCautionIngredients: [],
    };
    const { rerender } = render(view(null, preview, false));
    expect(chip("기존 건성 성분")).toHaveAttribute("data-phase", "stay");
    rerender(view("BAD", preview, false));
    expect(screen.getByText("변경된 게 없어요")).toBeInTheDocument();
    expect(chip("기존 건성 성분")).toHaveAttribute("data-phase", "stay");
    expect(chip("기존 건성 성분")).not.toHaveClass("bg-danger-soft");
    expect(chip("기존 빠른 제외 성분")).toHaveAttribute("data-phase", "stay");
  });

  it("안 맞은 제품이 없으면 빈 결과 설명 대신 평가하면 찾는다고만 말한다", () => {
    render(view(null, EMPTY_PREVIEW));

    expect(screen.getByText("안 맞았던 제품을 평가하면 겹치는 성분을 찾아요")).toBeInTheDocument();
    expect(screen.queryByText("안 맞았던 제품에서 주의 성분을 찾지 못했어요.")).not.toBeInTheDocument();
  });

  it("선택이 같아도 새 응답이 오면 이전 성분을 지우고 새 성분을 표시한다", () => {
    const { rerender } = render(view("BAD"));
    const next = { ...PREVIEW, ratedBad: analysis(1, [ingredient(9, "새 응답 성분", 1)]) };
    rerender(view("BAD", next));
    expect(chip("새 응답 성분")).toHaveAttribute("data-phase", "enter");
    expect(screen.queryByText("알코올")).not.toBeInTheDocument();
  });

  it("움직임 줄이기에서는 움직이지 않고 바뀐 결과만 바로 보여 준다", () => {
    mockReducedMotion(true);
    const { rerender } = render(view(null));

    rerender(view("GOOD"));
    advance(0);

    expect(screen.queryByText("리모넨")).not.toBeInTheDocument();
    expect(Element.prototype.animate).not.toHaveBeenCalled();
  });
});
