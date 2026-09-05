/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BottomNavigation } from "./BottomNavigation";
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

describe("BottomNavigation 앱 햅틱", () => {
  it("현재 탭을 다시 누르면 선택 햅틱을 요청하지 않는다", async () => {
    render(<BottomNavigation />);

    await userEvent.click(screen.getByRole("link", { name: "홈" }));

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("다른 탭을 누르면 앱에 선택 햅틱을 요청한다", async () => {
    render(<BottomNavigation />);
    screen.getByRole("link", { name: "카테고리" }).addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(screen.getByRole("link", { name: "카테고리" }));

    expect(postMessage).toHaveBeenCalledWith("poudy:haptic:selection");
  });
});

describe("BottomNavigation 배치", () => {
  it("본문 높이와 관계없이 화면 하단에 고정한다", () => {
    render(<BottomNavigation />);

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toHaveClass("fixed", "bottom-0");
  });

  it("상품 카드 스켈레톤보다 위에 놓이고 고정 헤더와 시트보다는 아래에 놓인다", () => {
    render(<BottomNavigation />);

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toHaveClass("z-20");
  });
});

describe("BottomNavigation 선택 모션", () => {
  it("현재 경로의 탭을 선택된 상태로 표시한다", () => {
    render(<BottomNavigation />);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("link", { name: "카테고리" })).toHaveAttribute("data-selected", "false");
  });

  it("다른 탭을 누르면 경로가 바뀌기 전에 선택 상태를 먼저 옮긴다", async () => {
    render(<BottomNavigation />);
    const categoryLink = screen.getByRole("link", { name: "카테고리" });
    categoryLink.addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(categoryLink);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("data-selected", "false");
    expect(categoryLink).toHaveAttribute("data-selected", "true");
    expect(categoryLink).toHaveAttribute("data-activated", "true");
  });

  it("경로가 바뀐 뒤에도 아이콘 활성화 모션이 끝날 때까지 상태를 유지한다", async () => {
    const { rerender } = render(<BottomNavigation />);
    const categoryLink = screen.getByRole("link", { name: "카테고리" });
    categoryLink.addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(categoryLink);
    routerState.pathname = "/categories";
    rerender(<BottomNavigation />);

    const activatedCategoryLink = screen.getByRole("link", { name: "카테고리" });
    expect(activatedCategoryLink).toHaveAttribute("data-activated", "true");
    expect(activatedCategoryLink).toHaveAttribute("data-selected", "true");
  });

  it("경로가 되돌아오면 실제 경로의 탭을 다시 선택한다", async () => {
    vi.useFakeTimers();

    try {
      const { rerender } = render(<BottomNavigation />);
      const categoryLink = screen.getByRole("link", { name: "카테고리" });
      categoryLink.addEventListener("click", (event) => event.preventDefault());

      fireEvent.click(categoryLink);
      routerState.pathname = "/categories";
      rerender(<BottomNavigation />);
      expect(screen.getByRole("link", { name: "카테고리" })).toHaveAttribute("data-selected", "true");

      await vi.advanceTimersByTimeAsync(280);
      routerState.pathname = "/";
      rerender(<BottomNavigation />);

      expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("data-selected", "true");
      expect(screen.getByRole("link", { name: "카테고리" })).toHaveAttribute("data-selected", "false");
    } finally {
      vi.useRealTimers();
    }
  });

  it("다른 탭을 누르면 아이콘 전체를 한 번에 채운다", async () => {
    render(<BottomNavigation />);
    const categoryLink = screen.getByRole("link", { name: "카테고리" });
    categoryLink.addEventListener("click", (event) => event.preventDefault());

    expect(categoryLink.querySelectorAll("svg")).toHaveLength(1);
    expect(categoryLink.querySelector("svg")).toHaveAttribute("fill", "none");

    await userEvent.click(categoryLink);

    expect(categoryLink.querySelectorAll("svg")).toHaveLength(1);
    expect(categoryLink.querySelector("svg")).toHaveAttribute("fill", "currentColor");
    expect(categoryLink.querySelector("[data-icon-fragment]")).not.toBeInTheDocument();
  });

  it("흔들림이 끝나기 전에 다시 누르면 아이콘을 새로 만들어 처음부터 흔든다", async () => {
    render(<BottomNavigation />);
    const categoryLink = screen.getByRole("link", { name: "카테고리" });
    const searchLink = screen.getByRole("link", { name: "탐색" });
    for (const link of [categoryLink, searchLink]) {
      link.addEventListener("click", (event) => event.preventDefault());
    }

    await userEvent.click(categoryLink);
    const firstIcon = categoryLink.querySelector("[data-activated]");

    await userEvent.click(searchLink);
    await userEvent.click(categoryLink);

    // 같은 요소를 그대로 두면 keyframes 가 다시 시작하지 않아 흔들림이 한 번 걸러진다.
    const secondIcon = categoryLink.querySelector("[data-activated]");
    expect(secondIcon).not.toBe(firstIcon);
    expect(secondIcon).toHaveAttribute("data-activated", "true");
  });
});

describe("BottomNavigationSlot 경로 범위", () => {
  it("허용된 경로의 하위 세그먼트에서는 내비게이션을 보여 준다", () => {
    routerState.pathname = "/categories/skincare";

    render(<BottomNavigationSlot />);

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument();
  });

  it("이름만 비슷한 경로에서는 내비게이션을 보여 주지 않는다", () => {
    routerState.pathname = "/categories-archive";

    render(<BottomNavigationSlot />);

    expect(screen.queryByRole("navigation", { name: "주요 메뉴" })).not.toBeInTheDocument();
  });
});
