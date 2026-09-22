/**
 * @vitest-environment jsdom
 */
import type { RankingItem } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PopularKeywords } from "./PopularKeywords";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

/*
 * 다이얼이 구르는 동안 지나간 줄과 지금 줄이 함께 DOM 에 있다. 처음 자리에서는
 * 마지막 순위가 지나간 줄로 함께 있으므로, 펼쳐야만 보이는 말을 가운데에 하나 둔다.
 */
const items: readonly RankingItem[] = [
  { rank: 1, keyword: "나이아신아마이드" },
  { rank: 2, keyword: "어성초" },
  { rank: 3, keyword: "레티놀" },
  { rank: 4, keyword: "세라마이드" },
];

/** 접힌 줄에는 없고 펼친 목록에만 있는 말. */
const ONLY_WHEN_EXPANDED = "레티놀";

/* 모션을 줄이지 않는 환경을 기본으로 둔다. 순환을 확인하는 검사가 있다. */
const matchMedia = (reduced: boolean) =>
  vi.fn().mockReturnValue({
    matches: reduced,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

beforeEach(() => {
  vi.stubGlobal("matchMedia", matchMedia(false));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/*
 * 구르는 동안 지나간 줄과 지금 줄이 함께 DOM 에 있다. 지금 줄만 낭독기와 초점에 잡히므로
 * 링크로 골라 지금 보이는 줄을 짚는다.
 */
const currentRow = () => screen.getAllByRole("link").at(-1);

describe("PopularKeywords", () => {
  it("접혀 있으면 지금 순위만 읽힌다", () => {
    render(<PopularKeywords items={items} />);

    expect(currentRow()).toHaveTextContent("나이아신아마이드");
    // 펼치기 전에는 전체 목록이 없다. 지나간 줄 하나만 함께 있다.
    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인기 검색어 전체 보기" })).toHaveAttribute("aria-expanded", "false");
  });

  it("펼치면 전체 순위를 목록으로 보여 준다", async () => {
    render(<PopularKeywords items={items} />);

    await userEvent.click(screen.getByRole("button", { name: "인기 검색어 전체 보기" }));

    expect(screen.getByRole("button", { name: "인기 검색어 접기" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();
    expect(screen.getByText(`전체 순위 ${items.length}개`)).toBeInTheDocument();
  });

  /* 조건을 고르는 화면이 아니라 결과 화면으로 바로 간다. */
  it("검색어를 누르면 그 말의 검색 결과로 간다", () => {
    render(<PopularKeywords items={items} />);

    expect(currentRow()).toHaveAttribute("href", `/products?keyword=${encodeURIComponent("나이아신아마이드")}`);
  });

  it("시간이 지나면 다음 순위로 넘어간다", () => {
    vi.useFakeTimers();
    render(<PopularKeywords items={items} />);

    expect(currentRow()).toHaveTextContent("나이아신아마이드");

    act(() => vi.advanceTimersByTime(3500));

    expect(currentRow()).toHaveTextContent("어성초");
  });

  it("모션을 줄이면 넘어가지 않는다", () => {
    vi.stubGlobal("matchMedia", matchMedia(true));
    vi.useFakeTimers();
    render(<PopularKeywords items={items} />);

    act(() => vi.advanceTimersByTime(9000));

    expect(currentRow()).toHaveTextContent("나이아신아마이드");
  });

  /* 손을 얹자마자 열리면 지나가다 스친 것만으로 목록이 튀어나온다. */
  it("손을 얹고 잠시 머물러야 목록이 열린다", () => {
    vi.useFakeTimers();
    const { container } = render(<PopularKeywords items={items} />);
    const section = container.querySelector("section")!;

    fireEvent.mouseEnter(section);
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();
  });

  /* 화면을 가로질러 지나가는 손은 바 위를 스치기만 한다. 그때 목록이 튀어나오면 안 된다. */
  it("스치고 지나가면 목록이 열리지 않는다", () => {
    vi.useFakeTimers();
    const { container } = render(<PopularKeywords items={items} />);
    const section = container.querySelector("section")!;

    fireEvent.mouseEnter(section);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.mouseLeave(section);

    /* 떠난 뒤로는 아무리 기다려도 열리지 않는다. 머문 시간을 재던 시계를 껐기 때문이다. */
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();
  });

  it("손을 떼면 목록이 닫힌다", () => {
    vi.useFakeTimers();
    const { container } = render(<PopularKeywords items={items} />);
    const section = container.querySelector("section")!;

    fireEvent.mouseEnter(section);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();

    fireEvent.mouseLeave(section);
    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();
  });

  /*
   * 제품명 검색 화면은 인기 검색어를 보러 들어오는 자리라 처음부터 펼쳐 둔다.
   * 홈은 지나가는 길이라 접은 채로 시작한다.
   */
  it("펼친 채로 시작하라고 하면 손을 대지 않아도 전체 순위가 보인다", () => {
    render(<PopularKeywords items={items} defaultExpanded />);

    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인기 검색어 접기" })).toHaveAttribute("aria-expanded", "true");
  });

  /* 펼쳐 두고 시작해도 접을 수 있다. 접으면 한 줄만 도는 평소 모습으로 돌아간다. */
  it("펼친 채로 시작해도 접을 수 있다", async () => {
    render(<PopularKeywords items={items} defaultExpanded />);

    await userEvent.click(screen.getByRole("button", { name: "인기 검색어 접기" }));

    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인기 검색어 전체 보기" })).toHaveAttribute("aria-expanded", "false");
  });

  /* 펼쳐 두면 전체가 이미 보인다. 그 위에서 한 줄만 따로 도는 것은 볼 데를 흩는다. */
  it("펼친 채로 시작하면 순위가 넘어가지 않는다", () => {
    vi.useFakeTimers();
    render(<PopularKeywords items={items} defaultExpanded />);

    act(() => vi.advanceTimersByTime(9000));

    expect(screen.getByText(`전체 순위 ${items.length}개`)).toBeInTheDocument();
  });

  /*
   * 자리를 차지하는 목록은 손이 떠나도 남는다. 커서가 지나갈 때마다 닫히면 처음부터
   * 펼쳐 둔 뜻이 사라지고, 아래 최근 검색이 밀렸다 돌아오기를 되풀이한다.
   */
  it("자리를 차지하는 목록은 손을 떼도 닫히지 않는다", () => {
    const { container } = render(<PopularKeywords items={items} defaultExpanded flowWhenExpanded />);
    const section = container.querySelector("section")!;

    fireEvent.mouseLeave(section);

    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();
  });

  /* 띄워 둔 목록만 아래를 덮으므로, 자리를 차지할 때는 떠 있는 표시를 걷는다. */
  it("자리를 차지하는 목록은 띄우지 않는다", () => {
    render(<PopularKeywords items={items} defaultExpanded flowWhenExpanded />);

    expect(screen.getByRole("list")).not.toHaveClass("absolute");
  });

  it("순위가 비면 아무것도 그리지 않는다", () => {
    const { container } = render(<PopularKeywords items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  /*
   * 변동은 기호로 그린다. 화살표와 가로줄은 낭독기가 읽어도 뜻이 전해지지 않으므로,
   * 눈으로 보는 기호와 귀로 듣는 말을 따로 둔다.
   */
  it("순위 변동을 기호와 말로 함께 알린다", async () => {
    const changed: readonly RankingItem[] = [
      { rank: 1, keyword: "상승어", change: { movement: "UP", steps: 2 } },
      { rank: 2, keyword: "하락어", change: { movement: "DOWN", steps: 3 } },
      { rank: 3, keyword: "신규어", change: { movement: "NEW", steps: 0 } },
      { rank: 4, keyword: "유지어", change: { movement: "SAME", steps: 0 } },
    ];

    render(<PopularKeywords items={changed} />);
    await userEvent.click(screen.getByRole("button", { name: "인기 검색어 전체 보기" }));

    const list = screen.getByRole("list");

    /*
     * 오름과 내림은 아이콘으로 그린다. 스프라이트를 참조하므로 어느 것을 가리키는지로 가린다.
     * 계단 수는 순위 숫자와 겹치므로, 아이콘이 든 칸 안에서만 찾는다.
     */
    const up = list.querySelector('use[href="#icon-trending-up"]')?.closest("span");
    const down = list.querySelector('use[href="#icon-trending-down"]')?.closest("span");

    expect(up).toHaveTextContent("2");
    expect(down).toHaveTextContent("3");
    expect(within(list).getByText("NEW")).toBeInTheDocument();
    expect(within(list).getByText("2계단 상승", { exact: false })).toBeInTheDocument();
    expect(within(list).getByText("3계단 하락", { exact: false })).toBeInTheDocument();
    expect(within(list).getByText("변동 없음", { exact: false })).toBeInTheDocument();
  });

  /* 서버는 견줄 지난 집계가 없으면 `change` 를 빼고 내려보낸다. 그때도 줄은 서야 한다. */
  it("변동이 오지 않아도 검색어를 그린다", async () => {
    render(<PopularKeywords items={items} />);
    await userEvent.click(screen.getByRole("button", { name: "인기 검색어 전체 보기" }));

    const list = screen.getByRole("list");

    expect(within(list).getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();
    expect(within(list).queryByText("NEW")).not.toBeInTheDocument();
    expect(within(list).queryByText("변동 없음", { exact: false })).not.toBeInTheDocument();
  });
});
