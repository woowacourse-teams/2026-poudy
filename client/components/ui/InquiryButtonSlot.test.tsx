/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InquiryButtonSlot } from "./InquiryButtonSlot";

const pathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useSearchParams: () => new URLSearchParams(),
}));

const renderAt = (path: string) => {
  pathname.mockReturnValue(path);
  return render(<InquiryButtonSlot />);
};

const button = () => screen.queryByRole("link", { name: "문의하기" });

describe("떠 있는 문의하기 버튼", () => {
  it("문의하기 화면이 아니면 보여 준다", () => {
    renderAt("/products/123");

    expect(button()).toBeInTheDocument();
  });

  it("문의하기 화면에서는 보여 주지 않는다", () => {
    renderAt("/inquiry");

    expect(button()).not.toBeInTheDocument();
  });

  it("제품 정보 정정 화면에서도 보여 주지 않는다", () => {
    renderAt("/inquiry/products/123");

    expect(button()).not.toBeInTheDocument();
  });

  it("누른 화면의 경로를 from 에 담아 보낸다", () => {
    renderAt("/products/123");

    expect(button()).toHaveAttribute("href", "/inquiry?from=%2Fproducts%2F123");
  });

  /* 위치는 버튼을 감싼 자리가 정한다. 본문 밖으로 나가지 않도록 sticky 로 흐름 안에 둔다. */
  const frame = () => button()?.parentElement;

  it("본문 흐름 안에 두어 넓은 화면에서도 본문 밖으로 나가지 않는다", () => {
    renderAt("/products");

    expect(frame()).toHaveClass("sticky");
  });

  it("하단 내비게이션이 있는 화면에서는 그 위로 올라간다", () => {
    renderAt("/products");

    expect(frame()).toHaveClass("bottom-[calc(4.5rem+env(safe-area-inset-bottom))]");
  });

  it("하단 내비게이션이 없는 화면에서는 화면 아래에 붙는다", () => {
    renderAt("/share/redirect");

    expect(frame()).toHaveClass("bottom-0");
  });
});
