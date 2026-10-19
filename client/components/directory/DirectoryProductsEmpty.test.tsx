/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DirectoryProductsEmpty } from "./DirectoryProductsEmpty";

const query = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.value),
  usePathname: () => "/brands/5",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const renderEmpty = () =>
  render(
    <DirectoryProductsEmpty
      basePath="/brands/5"
      noun="브랜드"
      directory={{ href: "/brands", label: "브랜드 전체 보기" }}
      icon="building-store"
    />,
  );

describe("카테고리·브랜드 결과 없음", () => {
  it("사용자가 건 조건이 있으면 조건을 모두 지운 이 화면으로 보낸다", () => {
    query.value = "moistureLevel=1";
    renderEmpty();

    expect(screen.getByText("조건에 맞는 제품이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "조건 모두 지우기" })).toHaveAttribute("href", "/brands/5");
  });

  it("조건이 없는데도 비었으면 디렉터리로 보낸다", () => {
    query.value = "";
    renderEmpty();

    expect(screen.getByText("아직 이 브랜드에 등록된 제품이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "브랜드 전체 보기" })).toHaveAttribute("href", "/brands");
  });
});
