/**
 * @vitest-environment jsdom
 */
import type { ProductPartResponse } from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { IngredientList } from "./IngredientList";

/** 실제 제품에 쓰이는 이름 가운데 끊을 자리가 없는 가장 긴 축에 속한다. */
const LONG_NAME = "폴리글리세릴-3메틸글루코오스다이스테아레이트";

const ingredient = (id: number, koreanName: string): ProductPartResponse["ingredients"][number] => ({
  id,
  koreanName,
  englishName: `Ingredient ${id}`,
  formulationRoles: [{ id: "1", code: "SKIN_CONDITIONING", name: "보습제" }],
  skinEffects: [],
  cautions: [],
});

const rowOf = (name: string) => screen.getByText(name).closest("a")!;

describe("전체 성분표", () => {
  it("주의 태그는 모두 표시하고 피부 작용은 첫 번째 하나만 표시한다", () => {
    render(
      <IngredientList
        ingredients={[
          {
            ...ingredient(1, "검증 성분"),
            cautions: [
              { code: "FRAGRANCE_ALLERGENS", label: "향료" },
              { code: "SULFATES", label: "설페이트" },
            ],
            skinEffects: [
              { id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "피부 수분 관련" },
              { id: "SOOTHING_RELATED", code: "SOOTHING_RELATED", name: "피부 진정 관련" },
            ],
          },
        ]}
      />,
    );

    const row = within(rowOf("검증 성분"));
    expect(row.getByText("향료")).toHaveClass("text-[#C53030]");
    expect(row.getByText("설페이트")).toHaveClass("text-[#C53030]");
    expect(row.getByText("수분")).toBeInTheDocument();
    expect(row.queryByText("진정")).not.toBeInTheDocument();
  });

  it("주의 성분이 뒤에 있어도 앞 5개만 보여 주고 펼친 뒤 원래 순서로 표시한다", async () => {
    const ingredients = Array.from({ length: 6 }, (_, index) => ingredient(index + 1, `성분 ${index + 1}`));
    const withCaution = ingredients.map((value, index) => ({
      ...value,
      cautions: index === 5 ? [{ code: "FRAGRANCE_ALLERGENS", label: "향료" }] : [],
    }));
    render(<IngredientList ingredients={withCaution} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(rowOf("성분 6").closest("li")).not.toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "나머지 1개 성분 펼쳐보기" }));
    expect(rowOf("성분 6").closest("li")).toBeVisible();
    expect(within(rowOf("성분 6")).getByText("향료")).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    ingredients.forEach((value, index) => {
      expect(within(rows[index]!).getByText(value.koreanName)).toBeInTheDocument();
    });
  });

  it("긴 이름이 칸을 넓히지 못하게 이름 칸을 줄어들 수 있게 둔다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    /*
     * `min-w-0` 이 없으면 flex 항목의 최소 너비가 글자 너비로 잡혀 칸이 부풀고,
     * 그만큼 오른쪽 태그와 화살표가 줄 밖으로 밀려난다.
     */
    expect(screen.getByText(LONG_NAME).parentElement).toHaveClass("flex-1");
    expect(screen.getByText(LONG_NAME).parentElement?.parentElement).toHaveClass("min-w-0", "flex-wrap");
  });

  it("이름이 길어도 태그와 화살표를 줄 안에 남긴다", () => {
    const tagged = {
      ...ingredient(1, LONG_NAME),
      skinEffects: [{ id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "피부 수분 관련" }],
    };
    render(<IngredientList ingredients={[tagged]} />);

    const row = within(rowOf(LONG_NAME));

    expect(row.getByText("수분")).toBeInTheDocument();
    expect(rowOf(LONG_NAME).querySelectorAll("svg")).toHaveLength(2);
  });

  it("피부 작용이 없는 성분에는 태그를 두지 않는다", () => {
    render(<IngredientList ingredients={[ingredient(1, "정제수")]} />);

    expect(rowOf("정제수").querySelectorAll("svg")).toHaveLength(1);
  });

  it("이름이 여러 줄이 되면 줄 높이가 따라 늘어난다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    /* 높이를 고정하면 두 줄이 된 이름이 줄 경계를 넘어간다. */
    expect(rowOf(LONG_NAME)).toHaveClass("min-h-[60px]");
    expect(rowOf(LONG_NAME)).not.toHaveClass("h-[60px]");
  });

  it("이름을 자르지 않고 전부 보여 준다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    const name = screen.getByText(LONG_NAME);

    expect(name).toHaveTextContent(LONG_NAME);
    expect(name.className).not.toMatch(/truncate|line-clamp/);
  });
});
