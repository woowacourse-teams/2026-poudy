/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode, Ref } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomActionBar } from "./bottom-action-bar";
import { BottomNavigation } from "./bottom-navigation";

describe("BottomNavigation", () => {
  it("다섯 칸(홈·카테고리·탐색·선반·마이)을 링크로 그리고 지금 탭에만 aria-current 를 붙인다", () => {
    render(<BottomNavigation current="shelf" />);
    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["홈", "카테고리", "탐색", "선반", "마이"]);
    expect(within(nav).getByRole("link", { name: "마이" })).toHaveAttribute("href", "/my-page");
    expect(within(nav).getByRole("link", { name: "선반" })).toHaveAttribute("aria-current", "page");
    expect(links.filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
    expect(within(nav).getByRole("link", { name: "선반" }).querySelector("use")).toHaveAttribute(
      "href",
      "#ds-icon-archive-filled",
    );
  });

  it("앱의 링크 요소와 주소로 그리고, 누르면 그 탭을 알린다", () => {
    const onSelect = vi.fn();
    function AppLink({
      href,
      children,
      ...rest
    }: {
      readonly href: string;
      readonly children?: ReactNode;
      readonly ref?: Ref<HTMLAnchorElement>;
    }) {
      return (
        <a data-app-link="" href={href} {...rest}>
          {children}
        </a>
      );
    }
    render(
      <BottomNavigation current={null} linkAs={AppLink} hrefs={{ explore: "/search/products" }} onSelect={onSelect} />,
    );
    const explore = screen.getByRole("link", { name: "탐색" });
    // jsdom 은 다른 문서로 이동하지 못한다. 이동은 막고 알림만 본다.
    explore.addEventListener("click", (event) => event.preventDefault());

    expect(explore).toHaveAttribute("data-app-link");
    expect(explore).toHaveAttribute("href", "/search/products");
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
    fireEvent.click(explore);
    expect(onSelect).toHaveBeenCalledWith("explore");
  });
});

describe("가상 키보드(A11Y D07)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const openKeyboard = () => {
    const listeners: (() => void)[] = [];
    const viewport = {
      height: 800,
      offsetTop: 0,
      addEventListener: (_: string, listener: () => void) => listeners.push(listener),
      removeEventListener: () => undefined,
    };
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 800);
    return () =>
      act(() => {
        viewport.height = 500;
        for (const listener of listeners) listener();
      });
  };

  it("입력에 포커스가 있고 키보드가 열리면 하단 내비는 숨고 행동 영역은 키보드 위로 올라간다", () => {
    const open = openKeyboard();
    render(
      <>
        <input aria-label="문의 내용" />
        <BottomActionBar position="screen-end" action={{ label: "문의 접수하기", onClick: vi.fn() }} />
        <BottomNavigation current="home" />
      </>,
    );
    screen.getByRole("textbox", { name: "문의 내용" }).focus();
    open();

    expect(screen.queryByRole("navigation", { name: "주요 메뉴" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "문의 접수하기" }).parentElement).toHaveStyle({
      transform: "translateY(-300px)",
    });
  });
});

describe("BottomActionBar", () => {
  it("막힌 버튼은 포커스를 남기고 안내 줄을 설명으로 읽으며, 눌러도 할 일을 부르지 않는다", () => {
    const onClick = vi.fn();
    render(
      <BottomActionBar
        position="screen-end"
        notice="문의 내용을 입력하면 접수할 수 있어요"
        action={{ label: "문의 접수하기", disabled: true, onClick }}
      />,
    );
    const button = screen.getByRole("button", { name: "문의 접수하기" });

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription("문의 내용을 입력하면 접수할 수 있어요");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("자리에 따라 아래 여백이 다르고, 폼 밖에서도 그 폼을 보낼 수 있다", () => {
    render(
      <>
        <BottomActionBar position="above-nav" action={{ label: "472개 제품 보기", onClick: vi.fn() }} />
        <BottomActionBar position="screen-end" action={{ label: "보내기", type: "submit", form: "inquiry" }} />
      </>,
    );
    const above = screen.getByRole("button", { name: "472개 제품 보기" }).parentElement;
    const submit = screen.getByRole("button", { name: "보내기" });

    expect(above).toHaveClass("pb-3");
    expect(submit.parentElement).toHaveClass("pb-safe");
    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toHaveAttribute("form", "inquiry");
  });
});
