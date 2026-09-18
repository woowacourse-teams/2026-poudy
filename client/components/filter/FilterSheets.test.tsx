/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { FilterSheets } from "./FilterSheets";

import { ProductList } from "@/components/product/ProductList";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import { allProducts, excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/** 조건에 걸린 제품 수를 정해 둔다. */
const countIs = (count: number) => server.use(http.get("*/api/products/count", () => HttpResponse.json({ count })));

const openSheet = async (name: RegExp) => {
  render(<ProductList excludeCodes={excludeCodes} />);

  await waitFor(() => expect(screen.getByRole("list")).toBeInTheDocument());
  await userEvent.click(screen.getByRole("button", { name }));

  return within(await screen.findByRole("dialog"));
};

/*
 * 적용 버튼은 네 시트가 BottomSheet 하나를 함께 쓴다. 시트마다 문구만 다르므로
 * 카테고리·브랜드·유수분·성분을 모두 훑어 어느 하나가 빠지지 않았는지 본다.
 */
const SHEETS = [
  { name: /카테고리/, label: /제품 보기/ },
  { name: /브랜드/, label: /제품 보기/ },
  { name: /유수분/, label: /보기/ },
  { name: /성분/, label: /제품 보기/ },
  { name: /피부 타입/, label: /제품 보기/ },
] as const;

describe("필터 시트의 적용 버튼", () => {
  it.each(SHEETS)("결과가 0개여도 조건 변경을 적용할 수 있다 ($name)", async ({ name, label }) => {
    countIs(0);

    const sheet = await openSheet(name);

    await waitFor(() => expect(sheet.getByRole("button", { name: label })).toHaveTextContent("0개"));
    expect(sheet.getByRole("button", { name: label })).toBeEnabled();
  });

  it.each(SHEETS)("제품이 있으면 누를 수 있다 ($name)", async ({ name, label }) => {
    countIs(7);

    const sheet = await openSheet(name);

    await waitFor(() => expect(sheet.getByRole("button", { name: label })).toBeEnabled());
  });

  /* 서버가 피부 타입을 하나만 받는다. 고른 것이 바뀌면 앞의 것이 풀려야 한다. */
  it("피부 타입은 한 번에 하나만 걸린다", async () => {
    countIs(7);

    const sheet = await openSheet(/피부 타입/);

    await userEvent.click(sheet.getByRole("radio", { name: "건성" }));
    expect(sheet.getByRole("radio", { name: "건성" })).toBeChecked();

    await userEvent.click(sheet.getByRole("radio", { name: "지성" }));
    expect(sheet.getByRole("radio", { name: "지성" })).toBeChecked();
    expect(sheet.getByRole("radio", { name: "건성" })).not.toBeChecked();
  });

  /* 하나만 고르는 자리라 다시 눌러 무르지 않는다. 무르는 일은 초기화가 맡는다. */
  it("고른 피부 타입을 다시 눌러도 풀리지 않는다", async () => {
    countIs(7);

    const sheet = await openSheet(/피부 타입/);

    await userEvent.click(sheet.getByRole("radio", { name: "민감성" }));
    await userEvent.click(sheet.getByRole("radio", { name: "민감성" }));

    expect(sheet.getByRole("radio", { name: "민감성" })).toBeChecked();
  });

  /*
   * 목록 응답이 내려준 것만 시트에 둔다. 결과에 없는 타입을 두면 골랐을 때 빈 목록이 나온다.
   * 상수를 그리면 조건과 상관없이 늘 네 개가 떠서 이 차이가 드러나지 않는다.
   */
  it("결과에 없는 피부 타입은 시트에 두지 않는다", async () => {
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({
          /* 목록이 비면 화면이 결과 없음을 그려 시트를 열 자리가 없다. 하나는 남긴다. */
          items: [allProducts[0]],
          pagination: { page: 1, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
          brands: [],
          categories: [],
          filterOptions: {
            brands: [],
            categories: [],
            skinTypes: [
              { code: "DRY", name: "건성" },
              { code: "SENSITIVE", name: "민감성" },
            ],
          },
          skinTypes: [
            { code: "DRY", name: "건성" },
            { code: "SENSITIVE", name: "민감성" },
          ],
        }),
      ),
    );

    const sheet = await openSheet(/피부 타입/);

    expect(sheet.getByRole("radio", { name: "건성" })).toBeInTheDocument();
    expect(sheet.getByRole("radio", { name: "민감성" })).toBeInTheDocument();
    expect(sheet.queryByRole("radio", { name: "지성" })).not.toBeInTheDocument();
    expect(sheet.queryByRole("radio", { name: "복합성" })).not.toBeInTheDocument();
  });

  it("초기화하면 고른 피부 타입이 풀린다", async () => {
    countIs(7);

    const sheet = await openSheet(/피부 타입/);

    await userEvent.click(sheet.getByRole("radio", { name: "복합성" }));
    await userEvent.click(sheet.getByRole("button", { name: "초기화" }));

    expect(sheet.getByRole("radio", { name: "복합성" })).not.toBeChecked();
  });

  it("아직 세는 중에는 막지 않는다", async () => {
    // 응답을 주지 않아 세는 중인 상태로 둔다.
    server.use(http.get("*/api/products/count", () => new Promise(() => {})));

    const sheet = await openSheet(/브랜드/);

    expect(sheet.getByRole("button", { name: /제품 보기/ })).toBeEnabled();
  });
});

describe("필터 초안과 적용 상태", () => {
  const props = {
    filter: { ...EMPTY_FILTER, brandIds: [1] },
    onApply: vi.fn(),
    onClose: vi.fn(),
    excludeCodes,
    categories: [],
    skinTypes: [],
    brands: [
      { id: 1, name: "첫 브랜드", englishName: "", imageUrl: "" },
      { id: 2, name: "둘째 브랜드", englishName: "", imageUrl: "" },
    ],
  };

  it.each(["edit", "reset"])("%s 후 취소하고 다시 열면 적용 상태로 돌아온다", async (operation) => {
    const { rerender } = render(<FilterSheets {...props} openSheet="brand" />);
    await userEvent.click(
      screen.getByRole(operation === "edit" ? "checkbox" : "button", {
        name: operation === "edit" ? "둘째 브랜드" : "초기화",
      }),
    );
    rerender(<FilterSheets {...props} openSheet={undefined} />);
    rerender(<FilterSheets {...props} openSheet="brand" />);
    expect(screen.getByRole("checkbox", { name: "첫 브랜드" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "둘째 브랜드" })).not.toBeChecked();
  });

  it("후보에서 빠진 기존 선택을 해제해 0개 결과에도 적용한다", async () => {
    countIs(0);
    const onApply = vi.fn();
    render(<FilterSheets {...props} brands={[]} openSheet="brand" onApply={onApply} />);
    await userEvent.click(screen.getByRole("button", { name: "브랜드 #1 해제" }));
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...props.filter, brandIds: [] });
  });

  it("보이지 않는 카테고리 선택은 후보 전체 선택으로 지워지지 않고 개별 해제할 수 있다", async () => {
    const onApply = vi.fn();
    render(
      <FilterSheets
        {...props}
        openSheet="category"
        onApply={onApply}
        filter={{ ...EMPTY_FILTER, categoryIds: [999] }}
        categories={[
          { id: 1, name: "스킨케어", productCount: 1, children: [{ id: 2, name: "크림", productCount: 1 }] },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "전체" }));
    expect(screen.getByRole("button", { name: "카테고리 #999 해제" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "카테고리 #999 해제" }));
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, categoryIds: [2] });
  });

  it("후보에 없는 피부 타입도 이름을 표시하고 해제할 수 있다", async () => {
    const onApply = vi.fn();
    render(
      <FilterSheets {...props} openSheet="skinType" onApply={onApply} filter={{ ...EMPTY_FILTER, skinType: "DRY" }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "건성 해제" }));
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, skinType: undefined });
  });
});
