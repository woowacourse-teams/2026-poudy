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

describe("BottomNavigation 선택 모션", () => {
  it("현재 경로의 배경과 표시를 선택된 탭 위치에 둔다", () => {
    render(<BottomNavigation />);

    expect(screen.getByRole("list")).toHaveAttribute("data-selected-index", "0");
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("data-selected", "true");
    expect(screen.getByRole("link", { name: "카테고리" })).toHaveAttribute("data-selected", "false");
  });

  it("다른 탭을 누르면 경로가 바뀌기 전에 선택 배경을 해당 방향으로 이동한다", async () => {
    render(<BottomNavigation />);
    const categoryLink = screen.getByRole("link", { name: "카테고리" });
    categoryLink.addEventListener("click", (event) => event.preventDefault());

    await userEvent.click(categoryLink);

    expect(screen.getByRole("list")).toHaveAttribute("data-selected-index", "1");
    expect(screen.getByRole("list")).toHaveAttribute("data-travel-direction", "right");
    expect(screen.getByRole("list")).toHaveAttribute("data-traveling", "true");
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
    expect(screen.getByRole("list")).toHaveAttribute("data-traveling", "true");
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
      expect(screen.getByRole("list")).toHaveAttribute("data-selected-index", "1");

      await vi.advanceTimersByTimeAsync(280);
      routerState.pathname = "/";
      rerender(<BottomNavigation />);

      expect(screen.getByRole("list")).toHaveAttribute("data-selected-index", "0");
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
