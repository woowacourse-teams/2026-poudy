/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductRows } from "./ProductRows";

import { fetchMyFilterMatches } from "@/lib/api/products";
import { EMPTY_FILTER } from "@/lib/domain/filter";
import type { useProductPages } from "@/lib/hooks/useProductPages";
import { products } from "@/mocks/fixtures";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/api/products", () => ({ fetchMyFilterMatches: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { readonly href: string; readonly children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const [first, second, third] = products;
const pages: ReturnType<typeof useProductPages> = {
  key: "list",
  first: 1,
  page: 1,
  items: [first, second],
  total: 3,
  hasNext: true,
  loading: false,
  loaded: true,
  failed: false,
  signedOut: false,
  rejected: false,
  restored: false,
  revalidating: false,
  loadingPrevious: false,
  previousFailed: false,
  loadNext: vi.fn(),
  loadPrevious: vi.fn(),
  retry: vi.fn(),
};

const rows = ({
  myFilter = false,
  count,
  result = pages,
}: {
  readonly myFilter?: boolean;
  readonly count?: number;
  readonly result?: ReturnType<typeof useProductPages>;
}) => (
  <ProductRows
    filter={{ ...EMPTY_FILTER, myFilter }}
    myFilterIngredientCount={count}
    basePath="/products"
    surface="product_list"
    pages={result}
    empty={<p>결과 없음</p>}
  />
);

const cardOf = (name: string) => screen.getByRole("link", { name: new RegExp(name) });

beforeEach(() => {
  vi.mocked(fetchMyFilterMatches).mockReset();
  window.sessionStorage.clear();
});

describe("내 필터에 걸림 태그(#1245)", () => {
  it("나만의 필터를 끈 목록에서 걸린 제품 카드에만 태그를 붙인다", async () => {
    vi.mocked(fetchMyFilterMatches).mockResolvedValue([second.id]);
    render(rows({ count: 2 }));

    await waitFor(() => expect(cardOf(second.name)).toHaveTextContent("내 필터에 걸림"));
    expect(cardOf(first.name)).not.toHaveTextContent("내 필터에 걸림");
    expect(fetchMyFilterMatches).toHaveBeenCalledWith([first.id, second.id]);
  });

  it("이어 붙인 장은 처음 보는 제품만 묻는다", async () => {
    vi.mocked(fetchMyFilterMatches).mockResolvedValueOnce([first.id]).mockResolvedValueOnce([third.id]);
    const view = render(rows({ count: 2 }));
    await waitFor(() => expect(cardOf(first.name)).toHaveTextContent("내 필터에 걸림"));

    view.rerender(rows({ count: 2, result: { ...pages, page: 2, items: [first, second, third], hasNext: false } }));

    await waitFor(() => expect(cardOf(third.name)).toHaveTextContent("내 필터에 걸림"));
    expect(cardOf(first.name)).toHaveTextContent("내 필터에 걸림");
    expect(fetchMyFilterMatches).toHaveBeenLastCalledWith([third.id]);
    expect(fetchMyFilterMatches).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["나만의 필터를 켠 목록", { myFilter: true, count: 2 }],
    ["로그인 전이거나 필터가 빈 회원", { count: 0 }],
    ["회원 상태를 읽는 중", { count: undefined }],
  ])("%s은 묻지 않고 태그도 없다", async (_, options) => {
    vi.mocked(fetchMyFilterMatches).mockResolvedValue([first.id]);
    render(rows(options));

    await Promise.resolve();
    expect(fetchMyFilterMatches).not.toHaveBeenCalled();
    expect(screen.queryByText("내 필터에 걸림")).toBeNull();
  });

  it("묻지 못하면 태그 없이 목록을 그대로 둔다", async () => {
    vi.mocked(fetchMyFilterMatches).mockRejectedValue(new Error("network"));
    render(rows({ count: 2 }));

    await waitFor(() => expect(fetchMyFilterMatches).toHaveBeenCalled());
    expect(screen.queryByText("내 필터에 걸림")).toBeNull();
    expect(cardOf(first.name)).toBeInTheDocument();
  });
});
