/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { FilterFacetOptions } from "./FilterFacetOptions";

import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import type { FilterFacet } from "@/lib/domain/filter-options";
import { allProducts } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

function Sheet({ facet, initial }: { readonly facet: FilterFacet; readonly initial: Filter }) {
  const [draft, setDraft] = useState(initial);
  return <FilterFacetOptions facet={facet} draft={draft} onChange={setDraft} />;
}

describe("자기 조건을 제외한 시트 선택지", () => {
  it("이미 고른 브랜드를 유지하면서 두 번째 브랜드를 더 고른다", async () => {
    render(<Sheet facet="brand" initial={{ ...EMPTY_FILTER, brandIds: [1] }} />);
    const choices = await screen.findAllByRole("checkbox");
    expect(choices.length).toBeGreaterThan(1);
    const selected = choices.find((choice) => choice.getAttribute("aria-checked") === "true")!;
    const other = choices.find((choice) => choice.getAttribute("aria-checked") === "false")!;
    await userEvent.click(other);
    expect(selected).toBeChecked();
    expect(other).toBeChecked();
  });

  it("피부 타입을 고른 상태에서도 다른 타입으로 바꾼다", async () => {
    render(<Sheet facet="skinType" initial={{ ...EMPTY_FILTER, skinType: "DRY" }} />);
    const dry = await screen.findByRole("radio", { name: "건성" });
    expect(dry).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "지성" }));
    expect(dry).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "지성" })).toBeChecked();
  });

  it("다른 조건에 해당하는 제품이 없는 브랜드는 제외한다", async () => {
    render(<Sheet facet="brand" initial={{ ...EMPTY_FILTER, brandIds: [1], keyword: "독도" }} />);
    const choices = await screen.findAllByRole("checkbox");
    const expected = [
      ...new Set(allProducts.filter((product) => product.name.includes("독도")).map((product) => product.brand.name)),
    ];
    expect(choices.map((choice) => choice.textContent)).toEqual(expected);
  });

  it("조회 실패는 빈 선택지와 구별하고 다시 시도할 수 있다", async () => {
    server.use(http.get("*/api/products", () => new HttpResponse(null, { status: 500 })));
    render(<Sheet facet="brand" initial={EMPTY_FILTER} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("선택지를 불러오지 못했어요");
    server.resetHandlers();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(1));
  });
});
