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
  render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);

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
  it.each(SHEETS)("결과가 0개면 적용 버튼을 막는다 ($name)", async ({ name, label }) => {
    countIs(0);

    const sheet = await openSheet(name);

    const submit = sheet.getByRole("button", { name: label });
    await waitFor(() => expect(submit).toHaveAttribute("aria-disabled", "true"));
    expect(submit).toHaveAccessibleName(/0개/);
    expect(sheet.queryByText(/조건에 맞는 제품이 없어요/)).not.toBeInTheDocument();
  });

  it.each(SHEETS)("제품이 있으면 누를 수 있다 ($name)", async ({ name, label }) => {
    countIs(7);

    const sheet = await openSheet(name);

    await waitFor(() => expect(sheet.getByRole("button", { name: label })).toBeEnabled());
  });

  /* 네 가지 모두 체크 목록 행이라 여러 개를 함께 고른다(명세 S23j). 민감성은 쿼리에서 sensitiveSkin 으로 따로 간다. */
  it("피부 타입은 건성·지성·복합성·민감성을 모두 함께 고를 수 있다", async () => {
    countIs(7);

    const sheet = await openSheet(/피부 타입/);

    await userEvent.click(sheet.getByRole("checkbox", { name: "건성" }));
    await userEvent.click(sheet.getByRole("checkbox", { name: "지성" }));
    await userEvent.click(sheet.getByRole("checkbox", { name: "민감성" }));

    expect(sheet.getByRole("checkbox", { name: "건성" })).toBeChecked();
    expect(sheet.getByRole("checkbox", { name: "지성" })).toBeChecked();
    expect(sheet.getByRole("checkbox", { name: "민감성" })).toBeChecked();
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
          filterOptions: {
            brands: [],
            categories: [],
            skinTypes: [
              { code: "DRY", name: "건성" },
              { code: "COMBINATION", name: "복합성" },
            ],
            sensitiveSkin: false,
            markGroups: [],
          },
        }),
      ),
    );

    const sheet = await openSheet(/피부 타입/);

    expect(sheet.getByRole("checkbox", { name: "건성" })).toBeInTheDocument();
    expect(sheet.getByRole("checkbox", { name: "복합성" })).toBeInTheDocument();
    expect(sheet.queryByRole("checkbox", { name: "민감성" })).not.toBeInTheDocument();
    expect(sheet.queryByRole("checkbox", { name: "지성" })).not.toBeInTheDocument();
  });

  it("초기화하면 고른 피부 타입이 풀린다", async () => {
    countIs(7);

    const sheet = await openSheet(/피부 타입/);

    await userEvent.click(sheet.getByRole("checkbox", { name: "복합성" }));
    await userEvent.click(sheet.getByRole("button", { name: "초기화" }));

    expect(sheet.getByRole("checkbox", { name: "복합성" })).not.toBeChecked();
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
    sensitiveSkinAvailable: false,
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

  it("후보에서 빠진 기존 선택을 해제해 적용한다", async () => {
    countIs(3);
    const onApply = vi.fn();
    render(<FilterSheets {...props} brands={[]} openSheet="brand" onApply={onApply} />);
    await userEvent.click(screen.getByRole("button", { name: "브랜드 #1 빼기" }));
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...props.filter, brandIds: [] });
  });

  it("보이지 않는 카테고리 선택을 따로 빼거나, 후보에서 하나를 골라 바꿀 수 있다", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "카테고리 #999 빼기" }));
    expect(screen.queryByRole("button", { name: "카테고리 #999 빼기" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "크림" }));
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, categoryIds: [2] });
  });

  it("후보에 없는 피부 타입도 이름을 표시하고 해제할 수 있다", async () => {
    const onApply = vi.fn();
    render(
      <FilterSheets
        {...props}
        openSheet="skinType"
        onApply={onApply}
        filter={{ ...EMPTY_FILTER, skinTypes: ["DRY"] }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "건성 빼기" }));
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, skinTypes: [] });
  });

  it("일반 피부 타입 없이 민감성 후보만 있으면 민감성 하나를 보여 준다", async () => {
    render(<FilterSheets {...props} openSheet="skinType" sensitiveSkinAvailable />);
    expect(screen.getByRole("checkbox", { name: "민감성" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.queryByText("지금 조건에서 고를 수 있는 피부 타입이 없어요.")).not.toBeInTheDocument();
  });

  it("일반 피부 타입과 민감성 후보가 모두 없으면 빈 상태를 보여 준다", async () => {
    render(<FilterSheets {...props} openSheet="skinType" />);
    expect(screen.getByRole("status")).toHaveTextContent("지금 조건에서 고를 수 있는 피부 타입이 없어요.");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("첫 페이지 후보를 받지 못했으면 빈 후보로 단정하지 않고 이동 링크를 보여 준다", async () => {
    render(<FilterSheets {...props} openSheet="skinType" optionsPageHref="/products" />);
    expect(screen.getByRole("link", { name: "첫 페이지에서 전체 필터 선택지 보기" })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(screen.queryByText("지금 조건에서 고를 수 있는 피부 타입이 없어요.")).not.toBeInTheDocument();
  });

  it("후보에서 빠진 민감성은 다른 타입을 골라도 유지하고, 따로 해제해 적용할 수 있다", async () => {
    countIs(3);
    const onApply = vi.fn();
    render(
      <FilterSheets
        {...props}
        openSheet="skinType"
        onApply={onApply}
        filter={{ ...EMPTY_FILTER, sensitiveSkin: true }}
        skinTypes={[{ code: "DRY", name: "건성" }]}
      />,
    );

    expect(screen.queryByRole("checkbox", { name: "민감성" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "건성" }));
    await userEvent.click(screen.getByRole("button", { name: "민감성 빼기" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /제품 보기/ })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, skinTypes: ["DRY"], sensitiveSkin: false });
  });

  it("다른 후보를 골라도 후보에 없는 기존 피부 타입을 자동으로 지우지 않는다", async () => {
    const onApply = vi.fn();
    render(
      <FilterSheets
        {...props}
        openSheet="skinType"
        onApply={onApply}
        sensitiveSkinAvailable
        filter={{ ...EMPTY_FILTER, skinTypes: ["OILY"] }}
        skinTypes={[{ code: "DRY", name: "건성" }]}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "민감성" }));
    expect(screen.getByRole("button", { name: "지성 빼기" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /제품 보기/ })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, skinTypes: ["OILY"], sensitiveSkin: true });
  });

  it("다중 타입과 민감성을 같은 조건으로 개수 조회와 적용에 전달한다", async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get("*/api/products/count", ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json({ count: 7 });
      }),
    );
    const onApply = vi.fn();
    render(
      <FilterSheets
        {...props}
        openSheet="skinType"
        filter={EMPTY_FILTER}
        onApply={onApply}
        sensitiveSkinAvailable
        skinTypes={[
          { code: "DRY", name: "건성" },
          { code: "OILY", name: "지성" },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "건성" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "지성" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "민감성" }));
    await waitFor(() => {
      expect(queries.at(-1)?.getAll("skinType")).toEqual(["DRY", "OILY"]);
      expect(queries.at(-1)?.get("sensitiveSkin")).toBe("true");
    });
    await userEvent.click(screen.getByRole("button", { name: /제품 보기/ }));
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTER, skinTypes: ["DRY", "OILY"], sensitiveSkin: true });
  });
});
