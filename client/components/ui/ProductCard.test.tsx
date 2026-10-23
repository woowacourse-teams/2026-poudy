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
  marks: [],
  imageUrl: "",
  price: 18000,
  volumeValue: 200,
  volumeUnit: "mL",
  moistureLevel: 2,
  oilLevel: 1,
  sensitiveSkin: false,
  updatedAt: "2026-08-03T00:00:00+09:00",
};

describe("ProductCard", () => {
  it("일반 제품 목록에는 저장 버튼을 표시하지 않는다", () => {
    render(<ProductCard product={product} />);
    expect(screen.queryByRole("button", { name: /저장/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1");
  });

  it("유수분을 제공하지 않는 제품은 수분·유분 태그를 표시하지 않는다", () => {
    render(<ProductCard product={{ ...product, moistureLevel: null, oilLevel: null }} />);
    expect(screen.queryByText(/^수분감 /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^유분감 /)).not.toBeInTheDocument();
    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
  });

  it("디자인의 가격과 단가 표기를 보여 준다", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText("라운드랩")).toBeInTheDocument();
    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
    expect(screen.getByText(/18,000원 · 200mL · mL당 90원/)).toBeInTheDocument();
  });

  it("제품 상세로 가는 링크가 있다", () => {
    render(<ProductCard product={product} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1");
  });

  it("기본 목록 이미지는 지연해서 불러온다", () => {
    const { container } = render(<ProductCard product={product} />);

    expect(container.querySelector("[data-product-image]")).toHaveAttribute("loading", "lazy");
  });

  it("첫 화면의 LCP 후보 이미지는 즉시 불러올 수 있다", () => {
    const { container } = render(<ProductCard product={product} imageLoading="eager" />);

    expect(container.querySelector("[data-product-image]")).toHaveAttribute("loading", "eager");
  });

  it("상세 진입 경로를 링크에 남긴다", () => {
    render(<ProductCard product={product} entryPoint="search_results" />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/1");
  });

  it("명세의 카드에는 저장 버튼이 없다. 저장은 제품 상세에서만 한다", () => {
    render(<ProductCard product={product} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("위시리스트가 넘기면 저장 버튼을 두고 누르면 제품 ID 를 넘긴다", async () => {
    const onToggle = vi.fn();
    render(<ProductCard product={product} save={{ saved: true, onToggle }} />);

    const button = screen.getByRole("button", { name: "1025 독도 토너 위시리스트에서 빼기" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);

    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it("카드 전체가 누르는 자리이고 hover 면은 거터 밖까지 가상 요소로 그린다", () => {
    render(<ProductCard product={product} />);

    // 면을 레이아웃 밖으로 넓히는 일은 fb-bleed 가 ::before 로 맡는다. 카드의 크기와 배치는 바뀌지 않는다.
    expect(screen.getByRole("link")).toHaveClass("pressable", "fb-bleed");
  });

  it("유수분 레벨을 색이 아닌 글자로도 읽을 수 있다", () => {
    render(<ProductCard product={product} />);

    // 수분 2 단계는 보통, 유분 1 단계는 낮음이다.
    expect(screen.getByText("수분감 보통")).toBeInTheDocument();
    expect(screen.getByText("유분감 낮음")).toBeInTheDocument();
  });

  it("제품 이름과 가격은 그림을 기다리지 않고 바로 읽힌다", () => {
    const { container } = render(<ProductCard product={product} />);
    const content = container.querySelector("[data-product-content]");

    // 그림에 load 를 주지 않은 첫 그림 상태다.
    expect(content).toBeVisible();
    expect(screen.getByText(product.name)).toBeVisible();
    expect(screen.getByText(product.brand.name)).toBeVisible();
  });

  it("그림이 오기 전에도 그림 자리를 잡아 둔다", () => {
    const { container } = render(<ProductCard product={product} />);
    const image = container.querySelector("img");

    // 자리를 잡아 두어야 그림이 도착해도 옆의 글이 밀리지 않는다. 칸은 80 이다(명세 IMAGE P02).
    expect(image).toHaveClass("size-20");
    expect(image).toHaveAttribute("width", "80");
  });

  it("그림을 받아 오지 못하면 기본 공병 그림으로 자리를 채운다", async () => {
    const { container } = render(<ProductCard product={product} />);
    const image = container.querySelector("img");

    fireEvent.error(image!);

    await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toContain("placeholder"));
  });
});
