/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IngredientTileGrid } from "./IngredientTileGrid";

const tiles = (names: readonly string[]) =>
  names.map((koreanName, key) => ({ key, koreanName, tile: <a href={`/ingredients/${key}`}>{koreanName}</a> }));

describe("IngredientTileGrid", () => {
  it("칸의 최소 폭을 정할 이름을 CSS 문자열로 넘긴다", () => {
    render(<IngredientTileGrid tiles={tiles(["세라마이드", "세라마이드에이에스"])} />);

    expect(screen.getByRole("list").style.getPropertyValue("--ingredient-tile-widest-name")).toBe(
      '"세라마이드에이에스"',
    );
  });

  it("타일마다 목록 항목 하나이고, 접근 가능한 이름은 그대로다", () => {
    render(<IngredientTileGrid tiles={tiles(["세라마이드", "세라마이드에이에스", "향료/알레르기 성분"])} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "세라마이드",
      "세라마이드에이에스",
      "향료/알레르기 성분",
    ]);
  });

  it("홀수면 마지막 타일 옆을 내용 없는 칸으로 채운다", () => {
    render(<IngredientTileGrid tiles={tiles(["가", "나", "다"])} />);

    const last = screen.getAllByRole("listitem").at(-1);
    expect(last?.children).toHaveLength(2);
    expect(last?.children[1]?.textContent).toBe("");
  });

  it("짝수면 채우는 칸을 두지 않는다", () => {
    render(<IngredientTileGrid tiles={tiles(["가", "나"])} />);

    expect(screen.getAllByRole("listitem").at(-1)?.children).toHaveLength(1);
  });
});
