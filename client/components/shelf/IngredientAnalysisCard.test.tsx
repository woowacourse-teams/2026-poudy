/** @vitest-environment jsdom */
import type {
  IngredientAnalysisItemResponse,
  IngredientAnalysisReasonResponse,
  IngredientAnalysisResponse,
} from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IngredientAnalysisCard } from "./IngredientAnalysisCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/pouch",
}));

const candidate = (
  id: number,
  reasons: readonly IngredientAnalysisReasonResponse[],
  inFilter = false,
): IngredientAnalysisItemResponse => ({
  id,
  koreanName: `성분 ${id}`,
  formulationRoles: [],
  groupCodes: [],
  reasons: [...reasons],
  products: [{ id: 1, name: "제품", imageUrl: "" }],
  inFilter,
  isNew: false,
});

const analysis: IngredientAnalysisResponse = {
  badProductCount: 1,
  items: [
    candidate(1, [
      { code: "QUICK_EXCLUDE", name: "빠른 제외 성분" },
      { code: "DRY_SKIN", name: "서버 건성 후보" },
      { code: "SENSITIVE_SKIN", name: "민감성 피부 주의 후보" },
    ]),
    candidate(2, [
      { code: "OILY_SKIN", name: "지성 피부 주의 후보" },
      { code: "SENSITIVE_SKIN", name: "민감성 피부 주의 후보" },
    ]),
    candidate(3, [{ code: "DRY_SKIN", name: "서버 건성 후보" }], true),
  ],
};

describe("성분 분석 후보별 표시", () => {
  it("피부 조건별로 나누지 않고 성분마다 칩 하나로 둔다", () => {
    render(<IngredientAnalysisCard analysis={analysis} filterCount={2} askSkinType={false} />);

    expect(screen.getByRole("heading", { name: "아직 제외하지 않은 성분 2" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /빠른 제외 성분|건성|지성|민감성/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "성분 1 성분 설명 보기" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "성분 3 성분 설명 보기" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "검색에서 제외 중 2" })).toBeInTheDocument();
    expect(screen.getByText("1개는 더 이상 의심되지 않아요")).toBeInTheDocument();
  });

  it("결과가 바뀌면 사라진 성분과 빈 분류를 함께 지운다", () => {
    const { rerender } = render(<IngredientAnalysisCard analysis={analysis} filterCount={0} askSkinType={false} />);
    rerender(
      <IngredientAnalysisCard
        analysis={{ ...analysis, items: [analysis.items[1]] }}
        filterCount={0}
        askSkinType={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "성분 1 성분 설명 보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /서버 건성 후보/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /빠른 제외 성분/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "아직 제외하지 않은 성분 1" })).toBeInTheDocument();
  });

  it("모든 후보가 사라지면 빈 결과를 보여 주고 분류와 고르기 버튼을 숨긴다", () => {
    render(<IngredientAnalysisCard analysis={{ badProductCount: 1, items: [] }} filterCount={1} askSkinType={false} />);

    const card = screen.getByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(within(card).getByText("안 맞았던 제품에서 주의 성분을 찾지 못했어요.")).toBeInTheDocument();
    expect(within(card).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });
});
