/** @vitest-environment jsdom */
import type { ProductIngredientResponse } from "@poudy/api/api.zod";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientList } from "./IngredientList";

import { track } from "@/lib/analytics/track";
import { untaggedProductDetail } from "@/mocks/fixtures";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const ingredients = untaggedProductDetail.selectedPart!.ingredients;

afterEach(() => window.history.replaceState(null, "", "/"));
beforeEach(() => vi.mocked(track).mockClear());

const LONG_NAME = "폴리글리세릴-3메틸글루코오스다이스테아레이트";
const ingredient = (id: number, koreanName: string): ProductIngredientResponse => ({
  id,
  koreanName,
  englishName: `Ingredient ${id}`,
  formulationRoles: [{ id: "1", code: "SKIN_CONDITIONING", name: "보습제" }],
  skinEffects: [],
  cautions: [],
});
const rowOf = (name: string) => screen.getByText(name).closest("a")!;

describe("전체 성분표 행", () => {
  it("긴 이름이 칸을 넓히지 못하게 이름 칸을 줄어들 수 있게 둔다", () => {
    render(<IngredientList productId={1} partId={1} ingredients={[ingredient(1, LONG_NAME)]} />);
    const nameLine = screen.getByText(LONG_NAME);
    expect(nameLine).toHaveClass("break-keep", "wrap-break-word");
    expect(nameLine.parentElement).toHaveClass("grow", "min-w-24");
    expect(nameLine.parentElement?.parentElement).toHaveClass("min-w-0", "flex-wrap");
  });

  it("피부 작용은 아이콘과 읽을 수 있는 이름을 가진 중립 태그로 모두 표시한다", () => {
    render(
      <IngredientList
        productId={1}
        partId={1}
        ingredients={[
          {
            ...ingredient(1, LONG_NAME),
            skinEffects: [
              { id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "피부 수분 관련" },
              { id: "SOOTHING_RELATED", code: "SOOTHING_RELATED", name: "진정 관련" },
            ],
          },
        ]}
      />,
    );
    const row = within(rowOf(LONG_NAME));
    expect(row.getByText("수분")).toBeInTheDocument();
    expect(row.getByText("진정")).toBeInTheDocument();
    expect(rowOf(LONG_NAME).querySelectorAll("svg")).toHaveLength(3);
  });

  it("주의 성분군 태그는 오른쪽에 모두 둔다", () => {
    render(
      <IngredientList
        productId={1}
        partId={1}
        ingredients={[
          {
            ...ingredient(1, "메틸파라벤"),
            cautions: [
              { code: "HARSH_PRESERVATIVES", label: "파라벤 계열" },
              { code: "FRAGRANCE_ALLERGENS", label: "향료" },
            ],
          },
        ]}
      />,
    );
    const row = within(rowOf("메틸파라벤"));
    expect(row.getByText("파라벤 계열")).toBeInTheDocument();
    expect(row.getByText("향료")).toBeInTheDocument();
  });

  it("피부 작용이 없는 성분에는 태그를 두지 않는다", () => {
    render(<IngredientList productId={1} partId={1} ingredients={[ingredient(1, "정제수")]} />);
    expect(rowOf("정제수").querySelectorAll("svg")).toHaveLength(1);
  });

  it("이름이 여러 줄이 되면 줄 높이가 따라 늘어난다", () => {
    render(<IngredientList productId={1} partId={1} ingredients={[ingredient(1, LONG_NAME)]} />);
    expect(rowOf(LONG_NAME)).toHaveClass("min-h-15");
    expect(rowOf(LONG_NAME)).not.toHaveClass("h-15");
  });

  it("이름을 자르지 않고 전부 보여 준다", () => {
    render(<IngredientList productId={1} partId={1} ingredients={[ingredient(1, LONG_NAME)]} />);
    const name = screen.getByText(LONG_NAME);
    expect(name).toHaveTextContent(LONG_NAME);
    expect(name.className).not.toMatch(/truncate|line-clamp/);
  });

  it("주의 성분의 피부 작용과 주의 태그를 모두 빠짐없이 보인다", () => {
    render(
      <IngredientList
        productId={1}
        partId={1}
        ingredients={[
          {
            ...ingredient(1, "향료"),
            skinEffects: [{ id: "HYDRATION_RELATED", code: "HYDRATION_RELATED", name: "피부 수분 관련" }],
            cautions: [{ code: "FRAGRANCE_ALLERGENS", label: "향료" }],
          },
        ]}
      />,
    );
    const row = within(rowOf("보습제"));
    expect(row.getAllByText("향료")).toHaveLength(2);
    expect(row.getByText("수분")).toBeInTheDocument();
  });
});

describe("전체 성분 시트", () => {
  it("성분 상세 페이지로 떠난 후 돌아오면 해당 제품·구성품의 시트와 스크롤만 복원한다", async () => {
    const { unmount } = render(<IngredientList productId={1} partId={1} ingredients={ingredients} />);
    await userEvent.click(screen.getByRole("button", { name: /전체 성분 .*개 보기/ }));
    const sheet = screen.getByRole("dialog", { name: /전체 성분/ });
    sheet.querySelector<HTMLElement>("[data-sheet-body]")!.scrollTop = 360;
    await userEvent.click(within(sheet).getAllByRole("link")[10]);
    expect(screen.queryByRole("dialog", { name: ingredients[10].koreanName })).not.toBeInTheDocument();
    unmount();
    const nextPart = render(<IngredientList productId={1} partId={2} ingredients={ingredients} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    nextPart.unmount();
    render(<IngredientList productId={1} partId={1} ingredients={ingredients} />);
    const restored = await screen.findByRole("dialog", { name: /전체 성분/ });
    expect(restored.querySelector<HTMLElement>("[data-sheet-body]")!.scrollTop).toBe(360);
    await userEvent.click(within(restored).getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /전체 성분 .*개 보기/ })).toHaveFocus();
  });
  it("최초 서버 HTML에도 실제 전성분 링크와 순번을 공식 순서대로 포함한다", () => {
    const html = renderToString(<IngredientList productId={1} partId={1} ingredients={ingredients} />);
    const document = new DOMParser().parseFromString(html, "text/html");
    const links = [...document.querySelectorAll("ol a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      ingredients.map((item) => `/ingredients/${item.id}`),
    );
    expect(links.at(-1)?.textContent).toContain(String(ingredients.length));
    expect(links.at(-1)?.textContent).toContain(ingredients.at(-1)!.koreanName);
    expect(document.querySelector("ol")?.closest("[hidden]")).not.toBeNull();
  });

  it("성분 행을 누르면 상세 페이지 링크를 따라가고 추가 시트를 열지 않는다", async () => {
    render(<IngredientList productId={1} partId={1} ingredients={ingredients} />);
    const opener = screen.getByRole("button", { name: `전체 성분 ${ingredients.length}개 보기` });
    await userEvent.click(opener);
    const sheet = await screen.findByRole("dialog", { name: `전체 성분 ${ingredients.length}개` });
    const body = sheet.querySelector<HTMLElement>("[data-sheet-body]")!;
    body.scrollTop = 480;
    const row = within(sheet).getAllByRole("link")[10];
    expect(row).toHaveAttribute("href", `/ingredients/${ingredients[10].id}`);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(row, click);
    expect(click.defaultPrevented).toBe(false);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(track).toHaveBeenCalledWith("ingredient_sheet_closed", {
      sheet_type: "full_ingredients",
      product_id: 1,
      close_method: "detail_link",
      open_seconds: expect.any(Number),
    });
    expect(track).not.toHaveBeenCalledWith(
      "ingredient_sheet_opened",
      expect.objectContaining({ sheet_type: "ingredient" }),
    );
  });

  it("새 탭 열기는 현재 시트의 스크롤 복원 상태와 열람 이벤트를 바꾸지 않는다", async () => {
    render(<IngredientList productId={1} partId={1} ingredients={ingredients} />);
    await userEvent.click(screen.getByRole("button", { name: /전체 성분 .*개 보기/ }));
    const sheet = screen.getByRole("dialog", { name: /전체 성분/ });
    const row = within(sheet).getAllByRole("link")[10];
    fireEvent.click(row, { ctrlKey: true });
    fireEvent.click(row, { metaKey: true });
    expect(window.history.state).toBeNull();
    expect(track).not.toHaveBeenCalledWith("ingredient_sheet_closed", expect.anything());
  });

  it("Esc로 전성분 시트를 닫으면 열기 버튼에 포커스가 복귀한다", async () => {
    render(<IngredientList productId={1} partId={1} ingredients={ingredients} />);
    const opener = screen.getByRole("button", { name: /전체 성분 .*개 보기/ });
    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
