/**
 * @vitest-environment jsdom
 */
import type { ProductResponse } from "@poudy/api/api.zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "./ProductCard";

const product: ProductResponse = {
  id: 1,
  name: "1025 독도 토너",
  brand: { id: 1, name: "라운드랩", englishName: "ROUND LAB", imageUrl: "" },
  imageUrl: "",
  price: 18000,
  volumeValue: 200,
  volumeUnit: "ml",
  moistureLevel: 2,
  oilLevel: 1,
};

describe("ProductCard", () => {
  it("디자인의 가격과 단가 표기를 보여 준다", () => {
    render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);

    expect(screen.getByText("라운드랩")).toBeInTheDocument();
    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.getByText(/18,000원 · 200ml · ml당 90원/)).toBeInTheDocument();
  });

  it("제품 상세로 가는 링크가 있다", () => {
    render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1");
  });

  it("기본 목록 이미지는 지연해서 불러온다", () => {
    const { container } = render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);

    expect(container.querySelector("[data-product-image]")).toHaveAttribute("loading", "lazy");
  });

  it("첫 화면의 LCP 후보 이미지는 즉시 불러올 수 있다", () => {
    const { container } = render(
      <ProductCard product={product} saved={false} onToggleSave={() => {}} imageLoading="eager" />,
    );

    expect(container.querySelector("[data-product-image]")).toHaveAttribute("loading", "eager");
  });

  it("상세 진입 경로를 링크에 남긴다", () => {
    render(<ProductCard product={product} saved={false} onToggleSave={() => {}} entryPoint="search_results" />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1?from=search_results");
  });

  it("저장 버튼에 제품 이름이 담긴 이름을 준다", () => {
    render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);

    expect(screen.getByRole("button", { name: "1025 독도 토너 저장" })).toBeInTheDocument();
  });

  it("저장한 제품은 해제 버튼으로 바뀐다", () => {
    render(<ProductCard product={product} saved onToggleSave={() => {}} />);

    const button = screen.getByRole("button", { name: "1025 독도 토너 저장 해제" });
    expect(button).not.toHaveAttribute("aria-pressed");
  });

  it("저장 버튼을 누르면 제품 ID 를 넘긴다", async () => {
    const onToggleSave = vi.fn();
    render(<ProductCard product={product} saved={false} onToggleSave={onToggleSave} />);

    await userEvent.click(screen.getByRole("button", { name: /저장/ }));

    expect(onToggleSave).toHaveBeenCalledWith(1);
  });

  it("유수분 레벨을 색이 아닌 글자로도 읽을 수 있다", () => {
    render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);

    // 수분 2 단계는 보통, 유분 1 단계는 낮음이다.
    expect(screen.getByText("보통")).toBeInTheDocument();
    expect(screen.getByText("낮음")).toBeInTheDocument();
  });

  it("제품 이름과 가격은 그림을 기다리지 않고 바로 읽힌다", () => {
    const { container } = render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);
    const content = container.querySelector("[data-product-content]");

    // 그림에 load 를 주지 않은 첫 그림 상태다.
    expect(content).toBeVisible();
    expect(screen.getByText(product.name)).toBeVisible();
    expect(screen.getByText(product.brand.name)).toBeVisible();
  });

  it("그림이 오기 전에도 그림 자리를 잡아 둔다", () => {
    const { container } = render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);
    const image = container.querySelector("img");

    // 자리를 잡아 두어야 그림이 도착해도 옆의 글이 밀리지 않는다.
    expect(image?.parentElement).toHaveClass("size-20");
  });

  it("그림이 오기 전에는 회색 자리를 두고, 도착하면 회색을 걷는다", async () => {
    const { container } = render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);
    const image = container.querySelector("img");
    const slot = container.querySelector("[data-thumbnail-state]");

    // 제품 그림은 배경이 비어 있어, 회색을 남겨 두면 그림 뒤로 그대로 비친다.
    expect(slot).toHaveAttribute("data-thumbnail-state", "loading");

    fireEvent.load(image!);

    await waitFor(() => expect(slot).toHaveAttribute("data-thumbnail-state", "loaded"));
  });

  it("그림을 받아 오지 못하면 기본 공병 그림으로 자리를 채운다", async () => {
    const { container } = render(<ProductCard product={product} saved={false} onToggleSave={() => {}} />);
    const image = container.querySelector("img");

    fireEvent.error(image!);

    await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toContain("placeholder"));
  });
});
