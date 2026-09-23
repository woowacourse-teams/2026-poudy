/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HidingTopBar } from "./HidingTopBar";
import { TopBar } from "./TopBar";

/* 바는 방문 기록과 라우터를 읽는다. 여기서 볼 것은 감싸는 쪽이 숨는지뿐이라 단추 하나만 세운다. */
vi.mock("./TopBar", () => ({ TopBar: vi.fn(() => <button type="button">뒤로 가기</button>) }));

/* 페이지 전체 높이. 화면 높이를 빼면 끝까지 내려갈 수 있는 거리가 된다. */
const PAGE_HEIGHT = 3000;

/*
 * 다음 프레임에 돌 일을 모아 둔다. 곧바로 돌리면 컴포넌트가 프레임 번호를 받기도 전에
 * 일이 끝나, 실제 브라우저와 순서가 뒤바뀐다.
 */
let frames: FrameRequestCallback[] = [];

const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  act(() => {
    fireEvent.scroll(window);
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(0));
  });
};

const bar = (container: HTMLElement) => container.querySelector(".hiding-top-bar");

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: PAGE_HEIGHT });
  /* 공용 훅은 끝까지 내려갈 수 있는 거리를 문서의 보이는 높이로 잰다. jsdom 은 0 이라 채워 둔다. */
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: window.innerHeight });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HidingTopBar", () => {
  it("처음에는 보인다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);

    expect(bar(container)).toHaveAttribute("data-hidden", "false");
  });

  it("내려 읽으면 물러나고 거슬러 올리면 돌아온다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);

    scrollTo(300);
    expect(bar(container)).toHaveAttribute("data-hidden", "true");

    scrollTo(200);
    expect(bar(container)).toHaveAttribute("data-hidden", "false");
  });

  /* 손을 뗄 때의 작은 흔들림마다 바가 오르내리면 화면이 떨려 보인다. */
  it("몇 px 의 흔들림으로는 방향을 바꾸지 않는다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);

    scrollTo(300);
    scrollTo(296);

    expect(bar(container)).toHaveAttribute("data-hidden", "true");
  });

  /* 천천히 올려도 움직인 거리가 쌓이면 결국 돌아온다. */
  it("천천히 거슬러 올려도 쌓인 거리로 돌아온다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);

    scrollTo(300);
    scrollTo(296);
    scrollTo(292);

    expect(bar(container)).toHaveAttribute("data-hidden", "false");
  });

  /* 맨 위 근처에서 숨겨 두면 바가 있던 자리가 빈 채로 드러난다. */
  it("맨 위 근처에서는 내려가도 숨지 않는다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);

    scrollTo(40);

    expect(bar(container)).toHaveAttribute("data-hidden", "false");
  });

  /* iOS 가 끝에서 늘였다 되돌리는 움직임을 거슬러 올리는 것으로 읽지 않는다. */
  it("끝 너머로 튕겨 나간 값은 보지 않는다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);
    const end = PAGE_HEIGHT - window.innerHeight;

    scrollTo(end);
    scrollTo(end + 60);
    scrollTo(end + 20);

    expect(bar(container)).toHaveAttribute("data-hidden", "true");
  });

  /*
   * 숨은 채로 초점만 들어가면 어디에 있는지 보이지 않는다. 숨김 상태는 스크롤로만 정하고,
   * 초점이 들어온 동안 내려오게 하는 일은 globals.css 의 `:focus-within` 규칙이 맡는다.
   * jsdom 은 그 규칙을 계산하지 않으므로 규칙이 걸릴 조건이 갖춰지는지만 본다.
   */
  it("키보드로 바 안의 단추에 닿으면 초점이 바 안에 머문다", () => {
    const { container, getByRole } = render(<HidingTopBar title="기획전" />);

    scrollTo(300);
    act(() => {
      getByRole("button", { name: "뒤로 가기" }).focus();
    });

    expect(bar(container)).toHaveAttribute("data-hidden", "true");
    expect(bar(container)?.matches(":focus-within")).toBe(true);
  });

  /* 상단바가 스스로 붙지 않게 하고 이 묶음이 붙는다. 두 겹으로 붙으면 그림자와 표식이 둘이 된다. */
  it("묶음이 붙고 안의 상단바는 스스로 붙지 않는다", () => {
    const { container } = render(<HidingTopBar title="기획전" />);

    expect(bar(container)).toHaveClass("sticky", "stuck-edge");
    expect(vi.mocked(TopBar).mock.calls.at(-1)?.[0]).toMatchObject({ sticky: false });
  });
});
