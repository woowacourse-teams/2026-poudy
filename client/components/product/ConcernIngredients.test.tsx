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

describe("고민별 성분 그림 카드", () => {
  it("고민마다 그림 카드를 두고, 성분군 안의 성분까지 중복 없이 센 성분 수를 적으며 효능명은 두지 않는다", () => {
    render(<UsageIngredients productId={1} part={part} />);
    expect(screen.getByRole("heading", { name: "이런 고민을 위한 성분이 있어요" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("서버 고민명성분 3종");
    expect(buttons[1]).toHaveTextContent("서버 두 번째 고민성분 1종");
    expect(screen.queryByText(/서버 수분 효능명/)).not.toBeInTheDocument();
  });

  it("키보드로 고민 그림을 눌러 근거 성분 시트를 열고, 서버가 합쳐 준 항목을 칩으로 늘어놓는다", async () => {
    render(<UsageIngredients productId={1} part={part} />);
    screen.getAllByRole("button")[0]!.focus();
    await userEvent.keyboard("{Enter}");

    const sheet = await screen.findByRole("dialog", { name: "건조하고 당기는 피부를 위한 성분 3종" });
    expect(
      within(within(sheet).getByRole("list", { name: "근거 성분" }))
        .getAllByRole("button")
        .map((chip) => chip.textContent),
    ).toEqual(["글라이콜 2종", "판테놀"]);
    expect(within(sheet).queryByText("서버 수분 효능명")).not.toBeInTheDocument();
  });

  it("고민별 결과가 비었으면 영역을 숨긴다", () => {
    const { container } = render(<UsageIngredients productId={1} part={{ ...part, concernGroups: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
