/** @vitest-environment jsdom */
import type { ProductPartResponse } from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { UsageIngredients } from "./UsageIngredients";

import { productDetails } from "@/mocks/fixtures";

const part: ProductPartResponse = {
  ...productDetails[0].selectedPart!,
  concernGroups: [
    {
      code: "DRYNESS",
      name: "서버 고민명",
      effects: [
        { code: "HYDRATION_RELATED", name: "서버 수분 효능명" },
        { code: "BARRIER_SUPPORT_RELATED", name: "서버 장벽 효능명" },
      ],
      items: [
        {
          type: "INGREDIENT_GROUP",
          code: "GLYCOLS",
          name: "글라이콜 계열",
          ingredients: [
            { id: 2, koreanName: "부틸렌글라이콜" },
            { id: 3, koreanName: "글리세린" },
          ],
        },
        { type: "INGREDIENT", id: 6, koreanName: "판테놀" },
      ],
    },
    {
      code: "WRINKLES",
      name: "서버 두 번째 고민",
      effects: [{ code: "WRINKLE_RELATED", name: "서버 주름 효능명" }],
      items: [{ type: "INGREDIENT", id: 3, koreanName: "글리세린" }],
    },
  ],
};

describe("고민별 성분 아코디언", () => {
  it("첫 고민을 열고 서버가 합쳐 준 항목을 한 목록으로 표시하며 효능명은 헤더에만 둔다", () => {
    render(<UsageIngredients productId={1} part={part} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("서버 고민명서버 수분 효능명 · 서버 장벽 효능명성분 3종");
    expect(buttons[0]).toHaveAttribute("aria-expanded", "true");
    expect(buttons[1]).toHaveTextContent("서버 두 번째 고민서버 주름 효능명성분 1종");
    expect(buttons[1]).toHaveAttribute("aria-expanded", "false");
    const content = document.getElementById(buttons[0].getAttribute("aria-controls")!)!;
    expect(within(content).getAllByRole("list")).toHaveLength(1);
    expect(within(content).queryByText("서버 수분 효능명")).not.toBeInTheDocument();
    expect(within(content).queryByText("서버 장벽 효능명")).not.toBeInTheDocument();
    expect(
      within(content)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["글라이콜 2종", "판테놀"]);
    expect(screen.queryByRole("link", { name: /제품 더 보기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "쓰임새별 성분" })).not.toBeInTheDocument();
  });

  it("키보드로 각각 펼치고 접으며 단일 효능 고민도 합쳐진 성분 목록을 표시한다", async () => {
    render(<UsageIngredients productId={1} part={part} />);
    const [first, second] = screen.getAllByRole("button");
    first.focus();
    await userEvent.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "false");
    await userEvent.tab();
    expect(second).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(second).toHaveAttribute("aria-expanded", "true");
    const content = document.getElementById(second.getAttribute("aria-controls")!)!;
    expect(within(second).getByText("서버 주름 효능명")).toBeInTheDocument();
    expect(within(content).queryByText("서버 주름 효능명")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "글리세린" })).toBeInTheDocument();
  });

  it("고민별 결과가 비었으면 영역을 숨긴다", () => {
    const { container } = render(<UsageIngredients productId={1} part={{ ...part, concernGroups: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
