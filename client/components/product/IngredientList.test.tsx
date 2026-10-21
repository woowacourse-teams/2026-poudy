/**
 * @vitest-environment jsdom
 */
import type { ProductPartResponse } from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
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
  it("긴 이름이 칸을 넓히지 못하게 이름 칸을 줄어들 수 있게 둔다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    // 이름 칸은 글자 폭을 기본 폭으로 삼아(grow) 태그가 먼저 다음 줄로 내려가고, 이름이 갈라지지 않는다.
    // 이름은 낱말 단위로만 줄을 바꾸고, 한 줄보다 긴 낱말만 글자 사이에서 갈라진다.
    // 이름 글줄(이름 + 작용 아이콘) → 이름 칸 → 이름 칸과 주의 태그를 담은 묶음 순서다.
    const nameLine = screen.getByText(LONG_NAME);
    expect(nameLine).toHaveClass("break-keep", "wrap-break-word");
    const nameColumn = nameLine.parentElement;
    expect(nameColumn).toHaveClass("grow", "min-w-24");
    expect(nameColumn?.parentElement).toHaveClass("min-w-0", "flex-wrap");
  });

  it("피부 작용은 이름 옆에 아이콘만 두고 작용 이름으로 읽힌다(A안)", () => {
    const tagged = {
      ...ingredient(1, LONG_NAME),
      skinEffects: [
        { id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "피부 수분 관련" },
        { id: "SOOTHING_RELATED", code: "SOOTHING_RELATED", name: "진정 관련" },
      ],
    };
    render(<IngredientList ingredients={[tagged]} />);

    const row = within(rowOf(LONG_NAME));

    expect(row.queryByText("수분")).not.toBeInTheDocument();
    expect(row.getByRole("img", { name: /수분/ })).toBeInTheDocument();
    // 작용 아이콘 둘과 화살표
    expect(rowOf(LONG_NAME).querySelectorAll("svg")).toHaveLength(3);
  });

  it("주의 성분군 태그는 오른쪽에 모두 둔다(A안)", () => {
    const cautioned = {
      ...ingredient(1, "메틸파라벤"),
      cautions: [
        { code: "HARSH_PRESERVATIVES", label: "파라벤 계열" },
        { code: "FRAGRANCE_ALLERGENS", label: "향료" },
      ],
    };
    render(<IngredientList ingredients={[cautioned]} />);

    const row = within(rowOf("메틸파라벤"));

    expect(row.getByText("파라벤 계열")).toBeInTheDocument();
    expect(row.getByText("향료")).toBeInTheDocument();
  });

  it("피부 작용이 없는 성분에는 태그를 두지 않는다", () => {
    render(<IngredientList ingredients={[ingredient(1, "정제수")]} />);

    expect(rowOf("정제수").querySelectorAll("svg")).toHaveLength(1);
  });

  it("이름이 여러 줄이 되면 줄 높이가 따라 늘어난다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    /* 높이를 고정하면 두 줄이 된 이름이 줄 경계를 넘어간다. */
    expect(rowOf(LONG_NAME)).toHaveClass("min-h-15");
    expect(rowOf(LONG_NAME)).not.toHaveClass("h-15");
  });

  it("이름을 자르지 않고 전부 보여 준다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    const name = screen.getByText(LONG_NAME);

    expect(name).toHaveTextContent(LONG_NAME);
    expect(name.className).not.toMatch(/truncate|line-clamp/);
  });

  it("주의 성분에는 작용 대신 주의 태그를 단다", () => {
    const fragrance = {
      ...ingredient(1, "향료"),
      skinEffects: [{ id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "피부 수분 관련" }],
      cautions: [{ code: "FRAGRANCE_ALLERGENS", label: "향료" }],
    };
    render(<IngredientList ingredients={[fragrance]} />);

    const row = within(rowOf("보습제"));
    expect(row.getAllByText("향료")).toHaveLength(2);
    expect(row.queryByText("수분")).not.toBeInTheDocument();
  });

  it("접힌 쪽의 주의 성분도 보이고, 그 앞에 감춘 성분의 순서를 한 줄로 알린다", () => {
    const ingredients = Array.from({ length: 16 }, (_, index) => ({
      ...ingredient(index + 1, `성분 ${index + 1}`),
      cautions: index === 13 ? [{ code: "FRAGRANCE_ALLERGENS", label: "향료" }] : [],
    }));
    render(<IngredientList ingredients={ingredients} />);

    expect(rowOf("성분 6").closest("li")).toHaveAttribute("hidden");
    expect(rowOf("성분 14").closest("li")).not.toHaveAttribute("hidden");
    expect(screen.getByText("06~13번 성분 8개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "나머지 10개 성분 펼쳐보기" })).toBeInTheDocument();
  });
});
