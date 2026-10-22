/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { bottomNavigationTabOf } from "./bottom-navigation-path";
import { BottomNavigationSlot } from "./BottomNavigationSlot";

const postMessage = vi.fn();
const routerState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => routerState.pathname,
}));

beforeEach(() => {
  routerState.pathname = "/";
  postMessage.mockClear();
  Object.defineProperty(window, "ReactNativeWebView", {
    configurable: true,
    value: { postMessage },
  });
});

const navigation = () => screen.queryByRole("navigation", { name: "주요 메뉴" });

describe("BottomNavigationSlot 탭", () => {
  it("홈·카테고리·탐색·선반·마이 다섯 칸을 그리고 탐색은 제품 탐색으로 연다", () => {
    render(<BottomNavigationSlot />);
    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["홈", "카테고리", "탐색", "선반", "마이"]);
    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute("href", "/search/products");
    expect(screen.getByRole("link", { name: "선반" })).toHaveAttribute("href", "/shelf");
    expect(screen.queryByRole("link", { name: "저장함" })).not.toBeInTheDocument();
  });

  it("지금 경로의 탭에 aria-current 를 붙이고 채운 아이콘으로 그린다", () => {
    routerState.pathname = "/my-page";
    render(<BottomNavigationSlot />);
    const myLink = screen.getByRole("link", { name: "마이" });

    expect(myLink).toHaveAttribute("aria-current", "page");
    expect(myLink.querySelector("use")).toHaveAttribute("href", "#ds-icon-user-filled");
    expect(screen.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");
  });

  it.each([
    ["/", "home"],
    ["/categories/skincare", "category"],
    ["/brands/1", "category"],
    ["/search/products", "explore"],
    ["/products/1", "explore"],
    ["/ingredients/1", "explore"],
    ["/ingredient-groups/A", "explore"],
    ["/shelf", "shelf"],
    ["/shelf/add", "shelf"],
    ["/my-page", "my"],
    ["/my-page/wishlist", "my"],
    ["/privacy", null],
  ] as const)("%s 는 %s 탭이다", (pathname, tab) => {
    expect(bottomNavigationTabOf(pathname)).toBe(tab);
  });

  it("제품 상세는 하단 고정 저장 바를 두고 내비를 숨긴다(S60)", () => {
    routerState.pathname = "/products/1";
    render(<BottomNavigationSlot />);

    expect(navigation()).not.toBeInTheDocument();
  });

  it("조건 일치 제품 목록은 내비를 그대로 둔다", () => {
    routerState.pathname = "/products";
    render(<BottomNavigationSlot />);

    expect(navigation()).toBeInTheDocument();
  });

  it("약관처럼 탭에 속하지 않는 화면은 내비는 보이지만 고른 탭이 없다", () => {
    routerState.pathname = "/privacy";
    render(<BottomNavigationSlot />);

    expect(navigation()).toBeInTheDocument();
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});

describe("BottomNavigationSlot 앱 햅틱", () => {
  it("현재 탭을 다시 누르면 선택 햅틱을 요청하지 않는다", async () => {
    render(<BottomNavigationSlot />);
    screen.getByRole("link", { name: "홈" }).addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(screen.getByRole("link", { name: "홈" }));

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("다른 탭을 누르면 앱에 선택 햅틱을 요청한다", async () => {
    render(<BottomNavigationSlot />);
    screen.getByRole("link", { name: "카테고리" }).addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(screen.getByRole("link", { name: "카테고리" }));

    expect(postMessage).toHaveBeenCalledWith("poudy:haptic:selection");
  });
});

describe("BottomNavigationSlot 경로 범위", () => {
  it("선반 화면에서는 내비게이션을 보여 주고 선반 탭을 고른다", () => {
    routerState.pathname = "/shelf";
    render(<BottomNavigationSlot />);

    expect(navigation()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "선반" })).toHaveAttribute("aria-current", "page");
  });

  it("허용된 경로의 하위 세그먼트에서는 내비게이션을 보여 준다", () => {
    routerState.pathname = "/categories/skincare";
    render(<BottomNavigationSlot />);

    expect(navigation()).toBeInTheDocument();
  });

  it.each([
    "/my-page/skin-type",
    "/my-page/withdraw",
    "/my-page/wishlist",
    "/my-page/filter",
    "/shelf/add",
    "/shelf/filter",
    "/shelf/guide",
    "/signup/profile",
    "/my-page-archive",
    "/categories-archive",
    "/inquiry",
  ])("%s 에서는 내비게이션을 보여 주지 않는다", (pathname) => {
    routerState.pathname = pathname;
    render(<BottomNavigationSlot />);

    expect(navigation()).not.toBeInTheDocument();
  });

  it("스크롤 막대가 높이를 재도록 표식 안에 두고, 본문이 짧아도 화면 아래로 민다", () => {
    render(<BottomNavigationSlot />);

    expect(navigation()?.parentElement).toHaveAttribute("data-bottom-navigation");
    expect(navigation()).toHaveClass("mt-auto");
  });
});
