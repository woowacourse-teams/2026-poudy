/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InquiryButtonSlot } from "./InquiryButtonSlot";
import { markNotFoundNavigation } from "./not-found-navigation";

const pathname = vi.fn();

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push }),
}));

const renderAt = (path: string) => {
  pathname.mockReturnValue(path);
  return render(<InquiryButtonSlot />);
};

const button = () => screen.queryByRole("link", { name: "문의하기" });

const LIFTED =
  "-translate-y-[calc(var(--floating-gap)+3rem+var(--bottom-action-bar-above-nav-measured,0px)+var(--comparison-float-height)+var(--wishlist-shelf-bar-lift,0px))]";

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

  it("쌓임 순서 표의 떠 있음 층을 쓴다", () => {
    renderAt("/products");

    expect(frame()).toHaveClass("z-(--z-floating)");
  });

  it("hover 와 눌림을 usePressable 이 맡는다", () => {
    renderAt("/categories");

    expect(screen.getByRole("link", { name: "문의하기" })).toHaveClass("pressable", "press-scale", "fb-tint-brand");
  });

  it("하단 내비게이션이 있는 화면에서는 그 위로 올라간다", () => {
    renderAt("/categories");

    expect(frame()).toHaveClass("bottom-[var(--bottom-navigation-height)]");
  });

  it.each(["/products", "/categories/2", "/brands/3"])(
    "제품 목록 %s에서는 하단 내비 위에 있고, 비교함이 뜬 높이만큼 함께 올라간다",
    (pathname) => {
      renderAt(pathname);

      expect(frame()).toHaveClass("bottom-[var(--bottom-navigation-height)]");
      expect(frame()).toHaveClass(LIFTED);
    },
  );

  it.each(["/my-page/gender", "/my-page/profile"])("버튼 줄이 붙은 %s에서는 그 줄 위로 올라간다", (pathname) => {
    renderAt(pathname);

    expect(frame()).toHaveClass("bottom-[var(--bottom-action-bar-height)]");
  });

  it("제품 상세에서는 화면 끝을 기준으로, 비교함과 하단 고정 바가 올라온 만큼 함께 올라간다", () => {
    renderAt("/products/123");

    expect(frame()).toHaveClass("bottom-0");
    expect(frame()).toHaveClass(LIFTED);
  });

  it("없는 주소 화면이 하단 내비를 그리면 그 위로 올라간다", () => {
    const unmark = markNotFoundNavigation();
    renderAt("/no-such-page");

    expect(frame()).toHaveClass("bottom-[var(--bottom-navigation-height)]");
    unmark();
  });

  it("하단 내비게이션이 없는 화면에서는 화면 아래에 붙는다", () => {
    renderAt("/share/redirect");

    expect(frame()).toHaveClass("bottom-0");
  });
});
