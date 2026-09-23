/**
 * @vitest-environment jsdom
 */
import type { CurationBlockResponse } from "@poudy/api/api.zod";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurationBlocks } from "./CurationBlocks";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.mocked(track).mockClear();
});

const CURATION_ID = 5;

const TONER = "3f7c2e18-91a5-4c63-8d2b-6e1f9a4c5b01";
const CREAM = "3f7c2e18-91a5-4c63-8d2b-6e1f9a4c5b02";

const product = (id: number, name: string) => ({
  id,
  name,
  brandName: "파우디",
  imageUrl: "",
  price: 18000,
  volumeValue: 200,
  volumeUnit: "ml",
  moistureLevel: 2,
  oilLevel: 1,
});

const imageBlock = {
  id: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e01",
  type: "IMAGE",
  spacingTop: 8,
  spacingBottom: 24,
  imageUrl: "/images/curations/autumn-barrier.jpg",
} as const satisfies CurationBlockResponse;

const productsBlock = {
  id: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e02",
  type: "PRODUCTS",
  spacingTop: 0,
  spacingBottom: 32,
  products: [product(1, "수분 토너"), product(2, "진정 크림")],
} as const satisfies CurationBlockResponse;

const filterBlock = {
  id: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e03",
  type: "PRODUCTS_BY_FILTER",
  spacingTop: 0,
  spacingBottom: 40,
  filters: [
    { id: TONER, label: "토너" },
    { id: CREAM, label: "크림" },
  ],
  products: [
    { product: product(1, "수분 토너"), filterIds: [TONER] },
    { product: product(2, "진정 크림"), filterIds: [CREAM] },
  ],
} as const satisfies CurationBlockResponse;

describe("CurationBlocks", () => {
  it("서버가 내려 준 순서대로 블록을 쌓는다", () => {
    const { container } = render(<CurationBlocks curationId={CURATION_ID} blocks={[imageBlock, productsBlock]} />);

    /* 이미지는 그대로, 제품 블록은 여백을 가진 상자 안에 목록이 놓인다. */
    const rendered = [...container.children].map((child) => child.querySelector("img, ul")?.tagName);

    expect(rendered).toEqual(["IMG", "UL"]);
  });

  /*
   * 기획전 이미지는 여백 없이 폭을 채우고 높이는 그림의 비율을 따른다. 여백은 제품 블록만
   * 가진다. 음수 여백으로 본문 여백을 빠져나가는 방식으로 되돌아가지 않게 지킨다.
   */
  it("이미지는 폭을 채우고 제품 블록만 좌우 여백을 가진다", () => {
    const { container } = render(<CurationBlocks curationId={CURATION_ID} blocks={[imageBlock, productsBlock]} />);

    const [imageSlot, productsSlot] = [...container.children];

    expect(imageSlot.querySelector("img")).toHaveClass("w-full", "h-auto");
    expect(imageSlot.querySelector("img")?.className).not.toMatch(/-mx-/);
    expect(productsSlot.firstElementChild).toHaveClass("px-4");
  });

  /*
   * 블록 사이의 여백은 기획전마다 다르다. 클라이언트가 한 가지 간격으로 묶으면 기획자가
   * 의도한 숨이 사라지므로, 서버가 준 값을 그대로 적는지 본다.
   */
  it("블록의 위아래 여백을 받은 값 그대로 적는다", () => {
    const { container } = render(<CurationBlocks curationId={CURATION_ID} blocks={[imageBlock]} />);

    const block = container.firstElementChild;

    /* margin 은 맞닿은 블록끼리 겹쳐 한쪽 값이 사라지므로 padding 으로 적어 두 값이 더해지게 한다. */
    expect(block).toHaveStyle({ paddingTop: "8px", paddingBottom: "24px" });
    expect(block).not.toHaveStyle({ marginTop: "8px" });
  });

  /* 홈의 인기 제품과 같은 카드를 쓴다. 브랜드와 제품명을 한 덩어리로 이어 두 줄에서 끊는다. */
  it("브랜드와 제품명을 한 줄로 이어 두 줄에서 줄임표로 끊는다", () => {
    render(<CurationBlocks curationId={CURATION_ID} blocks={[productsBlock]} />);

    const link = screen.getByRole("link", { name: /수분 토너/ });
    const text = link.querySelector(".line-clamp-2");

    expect(text).toHaveTextContent("파우디 수분 토너");
  });

  /* 맨 앞 이미지는 화면을 열자마자 보이는 LCP 요소라 먼저 받고, 뒤의 이미지는 미룬다. */
  it("맨 앞 블록의 이미지만 먼저 받는다", () => {
    const second = { ...imageBlock, id: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e09" } as const;
    const { container } = render(
      <CurationBlocks curationId={CURATION_ID} blocks={[imageBlock, productsBlock, second]} />,
    );

    const [first, later] = [...container.querySelectorAll("img")].filter((img) =>
      img.getAttribute("src")?.includes("autumn-barrier"),
    );

    expect(first).toHaveAttribute("loading", "eager");
    expect(first).toHaveAttribute("fetchpriority", "high");
    expect(later).toHaveAttribute("loading", "lazy");
    expect(later).not.toHaveAttribute("fetchpriority");
  });

  it("제품 블록의 제품을 모두 그리고 상세로 잇는다", () => {
    render(<CurationBlocks curationId={CURATION_ID} blocks={[productsBlock]} />);

    expect(screen.getByRole("link", { name: /수분 토너/ })).toHaveAttribute("href", "/products/1?from=curation");
    expect(screen.getByRole("link", { name: /진정 크림/ })).toHaveAttribute("href", "/products/2?from=curation");
  });

  it("필터를 누르면 그 조건의 제품만 남는다", () => {
    render(<CurationBlocks curationId={CURATION_ID} blocks={[filterBlock]} />);

    fireEvent.click(screen.getByRole("button", { name: "토너" }));

    expect(screen.getByRole("link", { name: /수분 토너/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /진정 크림/ })).not.toBeInTheDocument();
  });

  it("처음에는 블록의 제품을 모두 보여 준다", () => {
    render(<CurationBlocks curationId={CURATION_ID} blocks={[filterBlock]} />);

    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /수분 토너/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /진정 크림/ })).toBeInTheDocument();
  });

  /*
   * 필터는 화면 전체가 아니라 블록 안에서만 듣는다. 한 블록을 건드렸을 때 다른 블록까지
   * 같이 걸리면, 기획자가 나눠 둔 묶음이 서로 간섭한다.
   */
  it("한 블록의 필터가 다른 블록을 건드리지 않는다", () => {
    const second = { ...filterBlock, id: "0d4bd6d9-6a84-4a47-8f29-5b4c2d1a7e04" } as const;
    render(<CurationBlocks curationId={CURATION_ID} blocks={[filterBlock, second]} />);

    /* 앞 블록에서만 토너를 고른다. */
    const [firstToner] = screen.getAllByRole("button", { name: "토너" });
    fireEvent.click(firstToner);

    /* 뒤 블록은 그대로 전체라 크림이 남아 있다. */
    expect(screen.getAllByRole("link", { name: /수분 토너/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /진정 크림/ })).toHaveLength(1);
  });

  /* 어떤 필터가 실제로 쓰이는지 본다. ID 는 UUID 라 기획자가 붙인 이름도 함께 남긴다. */
  it("필터를 고르면 어느 기획전의 어느 블록에서 무엇을 골랐는지 남긴다", () => {
    render(<CurationBlocks curationId={CURATION_ID} blocks={[filterBlock]} />);

    fireEvent.click(screen.getByRole("button", { name: "크림" }));

    expect(track).toHaveBeenCalledWith("curation_filter_selected", {
      curation_id: CURATION_ID,
      block_id: filterBlock.id,
      filter_id: CREAM,
      filter_label: "크림",
    });
  });

  /* 전체로 되돌린 것은 고른 필터가 없으므로 filter_id 를 두지 않는다. 홈의 카테고리 칩과 같다. */
  it("전체로 되돌리면 필터 없이 남긴다", () => {
    render(<CurationBlocks curationId={CURATION_ID} blocks={[filterBlock]} />);

    fireEvent.click(screen.getByRole("button", { name: "전체" }));

    expect(track).toHaveBeenCalledWith("curation_filter_selected", {
      curation_id: CURATION_ID,
      block_id: filterBlock.id,
    });
  });

  it("걸러 낸 제품이 없으면 빈 안내를 보여 준다", () => {
    const empty = {
      ...filterBlock,
      products: [{ product: product(1, "수분 토너"), filterIds: [TONER] }],
    } satisfies CurationBlockResponse;
    render(<CurationBlocks curationId={CURATION_ID} blocks={[empty]} />);

    fireEvent.click(screen.getByRole("button", { name: "크림" }));

    expect(screen.getByText("고른 조건에 맞는 제품이 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /수분 토너/ })).not.toBeInTheDocument();
  });
});
