/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Screen, ScreenBody } from "./screen";
import { TopBar } from "./top-bar";

type ObserverCallback = (entries: { boundingClientRect: { top: number }; rootBounds: { top: number } }[]) => void;

/** IntersectionObserver 를 흉내 낸다. 표식이 위로 지나갔다고 알릴 수 있다. */
const observers: ObserverCallback[] = [];
const passTop = (passed: boolean) =>
  act(() => {
    for (const callback of observers)
      callback([{ boundingClientRect: { top: passed ? -1 : 0 }, rootBounds: { top: 0 } }]);
  });

describe("TopBar", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: ObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("하위 내비는 뒤로가기('이전 화면')·제목·오른쪽 행동을 그리고, 화면은 할 일만 넘긴다", () => {
    const onBack = vi.fn();
    const onShare = vi.fn();
    render(
      <TopBar
        variant="sub"
        title="성분 설명"
        back={{ onClick: onBack }}
        action={{ icon: "share", label: "나이아신아마이드 공유", onClick: onShare }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "성분 설명" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이전 화면" }));
    fireEvent.click(screen.getByRole("button", { name: "나이아신아마이드 공유" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("뒤로가기를 링크로 넘기면 그 링크에 이름과 꺾쇠를 붙여 그린다", () => {
    render(<TopBar variant="sub" title="성분 설명" back={{ asChild: <a href="/" />, label: "홈으로" }} />);
    const link = screen.getByRole("link", { name: "홈으로" });

    expect(link).toHaveAttribute("href", "/");
    expect(link.querySelector("[data-focus-ring] svg use")).toHaveAttribute("href", "#ds-icon-chevron-left");
  });

  it("글자 행동은 보이는 글자가 이름이다", () => {
    const onReset = vi.fn();
    render(
      <TopBar
        variant="sub"
        title="탐색 조건 설정"
        back={{ onClick: vi.fn() }}
        action={{ text: "초기화", onClick: onReset }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("큰 제목 내비는 뒤로가기 없이 아이콘 버튼을 두고, 시트를 여는 버튼은 열림 상태를 알린다", () => {
    render(
      <TopBar
        variant="large"
        title="선반"
        titleAs="p"
        actions={[
          { icon: "help-circle", label: "선반 설명 보기", onClick: vi.fn(), haspopup: "dialog", expanded: false },
          { icon: "plus", label: "제품 추가", onClick: vi.fn() },
        ]}
      />,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이전 화면" })).not.toBeInTheDocument();
    const help = screen.getByRole("button", { name: "선반 설명 보기" });
    expect(help).toHaveAttribute("aria-haspopup", "dialog");
    expect(help).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "제품 추가" })).not.toHaveAttribute("aria-expanded");
  });

  it("문서 스크롤형에서는 바가 위에 붙은 동안에만 아래 선을 긋는다", () => {
    render(<TopBar variant="explore" align="start" title="스킨케어" back={{ onClick: vi.fn() }} />);
    const bar = screen.getByRole("banner");

    expect(bar).not.toHaveAttribute("data-stuck");
    passTop(true);
    expect(bar).toHaveAttribute("data-stuck");
    passTop(false);
    expect(bar).not.toHaveAttribute("data-stuck");
  });

  it("본문 스크롤형에서는 본문이 내려간 뒤에 선을 긋고, edge 를 끄면 긋지 않는다", () => {
    const { rerender } = render(
      <Screen scroll="body">
        <TopBar variant="sub" title="문의하기" back={{ onClick: vi.fn() }} />
        <ScreenBody>본문</ScreenBody>
      </Screen>,
    );
    const bar = screen.getByRole("banner");

    expect(observers).toHaveLength(1);
    passTop(true);
    expect(bar).toHaveAttribute("data-stuck");

    rerender(
      <Screen scroll="body">
        <TopBar variant="sub" title="문의하기" back={{ onClick: vi.fn() }} edge={false} />
        <ScreenBody>본문</ScreenBody>
      </Screen>,
    );
    expect(bar).not.toHaveAttribute("data-stuck");
  });
});

describe("Screen", () => {
  it("본문 내부 스크롤형은 루트가 화면 높이를 넘지 않고 본문만 스크롤한다", () => {
    render(
      <Screen scroll="body">
        <ScreenBody className="px-gutter">본문</ScreenBody>
      </Screen>,
    );
    const body = screen.getByText("본문");

    expect(body).toHaveClass("min-h-0", "flex-1", "overflow-y-auto", "px-gutter");
    expect(body.parentElement).toHaveClass("h-dvh", "overflow-hidden");
  });

  it("문서 스크롤형은 루트가 내용만큼 늘고 본문은 스크롤 칸이 아니다", () => {
    render(
      <Screen scroll="document">
        <ScreenBody>본문</ScreenBody>
      </Screen>,
    );
    const body = screen.getByText("본문");

    expect(body).not.toHaveClass("overflow-y-auto");
    expect(body.parentElement).toHaveClass("min-h-dvh");
  });
});
