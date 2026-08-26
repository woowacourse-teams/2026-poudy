/**
 * @vitest-environment jsdom
 */
import type { ProductResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
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
    expect(button).toHaveAttribute("aria-pressed", "true");
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
});
