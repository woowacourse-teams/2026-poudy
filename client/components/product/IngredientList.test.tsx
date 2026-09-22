/**
 * @vitest-environment jsdom
 */
import type { ProductDetailResponse } from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IngredientList } from "./IngredientList";

/** 실제 제품에 쓰이는 이름 가운데 끊을 자리가 없는 가장 긴 축에 속한다. */
const LONG_NAME = "폴리글리세릴-3메틸글루코오스다이스테아레이트";

const ingredient = (id: number, koreanName: string): ProductDetailResponse["ingredients"][number] => ({
  id,
  koreanName,
  englishName: `Ingredient ${id}`,
  formulationRoles: [{ id: 1, code: "SKIN_CONDITIONING", name: "보습제" }],
  skinEffects: [],
});

const rowOf = (name: string) => screen.getByText(name).closest("a")!;

describe("전체 성분표", () => {
  it("긴 이름이 칸을 넓히지 못하게 이름 칸을 줄어들 수 있게 둔다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    /*
     * `min-w-0` 이 없으면 flex 항목의 최소 너비가 글자 너비로 잡혀 칸이 부풀고,
     * 그만큼 오른쪽 태그와 화살표가 줄 밖으로 밀려난다.
     */
    expect(screen.getByText(LONG_NAME).parentElement).toHaveClass("min-w-0", "flex-1");
  });

  it("이름이 길어도 태그와 화살표를 줄 안에 남긴다", () => {
    render(<IngredientList ingredients={[ingredient(1, LONG_NAME)]} />);

    const row = within(rowOf(LONG_NAME));

    expect(row.getByText("일반")).toBeInTheDocument();
    expect(rowOf(LONG_NAME).querySelector("svg")).toBeInTheDocument();
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
