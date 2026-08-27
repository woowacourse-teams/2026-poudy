/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { ProductSearchPanel } from "./ProductSearchPanel";

import { server } from "@/mocks/server";

type Match = { field: "PRODUCT_NAME" | "BRAND_NAME"; text: string; startIndex: number; endIndexExclusive: number };

const suggestion = (match: Match) =>
  server.use(
    http.get("*/api/products/suggestions", () =>
      HttpResponse.json({
        items: [{ id: 1, name: "1025 독도 토너", brandName: "라운드랩", imageUrl: "", match }],
        pagination: { page: 0, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
      }),
    ),
  );

/** 색이 얹힌 토막만 모은다. */
const marked = () =>
  Array.from(document.querySelectorAll("span.text-brand-strong")).map((element) => element.textContent);

const show = async (match: Match) => {
  suggestion(match);
  render(<ProductSearchPanel />);
  await userEvent.type(screen.getByRole("searchbox"), "독도");
  await screen.findByText("라운드랩", {}, { timeout: 4000 });
};

describe("제품 자동완성 하이라이팅", () => {
  it("제품명에서 걸리면 그 자리에 색을 얹는다", async () => {
    await show({ field: "PRODUCT_NAME", text: "1025 독도 토너", startIndex: 5, endIndexExclusive: 7 });

    expect(marked()).toEqual(["독도"]);
  });

  it("브랜드에서 걸려도 브랜드 줄에는 표시하지 않는다", async () => {
    await show({ field: "BRAND_NAME", text: "라운드랩", startIndex: 0, endIndexExclusive: 3 });

    // 고르는 것은 제품이다. 브랜드까지 물들이면 어느 줄을 보아야 할지 흐려진다.
    expect(marked()).toEqual([]);
    expect(screen.getByText("라운드랩")).toBeInTheDocument();
  });

  it("브랜드로 걸린 줄도 제품 이름은 평소 결로 읽힌다", async () => {
    await show({ field: "BRAND_NAME", text: "라운드랩", startIndex: 0, endIndexExclusive: 3 });

    expect(screen.getByText("1025 독도 토너").className).toContain("font-semibold");
  });
});
