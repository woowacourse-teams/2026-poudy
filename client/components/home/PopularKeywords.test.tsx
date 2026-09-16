/**
 * @vitest-environment jsdom
 */
import type { RankingItem } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

    act(() => vi.advanceTimersByTime(6000));

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
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();
  });

  it("손을 떼면 목록이 닫힌다", () => {
    vi.useFakeTimers();
    const { container } = render(<PopularKeywords items={items} />);
    const section = container.querySelector("section")!;

    fireEvent.mouseEnter(section);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText(ONLY_WHEN_EXPANDED)).toBeInTheDocument();

    fireEvent.mouseLeave(section);
    expect(screen.queryByText(ONLY_WHEN_EXPANDED)).not.toBeInTheDocument();
  });

  it("순위가 비면 아무것도 그리지 않는다", () => {
    const { container } = render(<PopularKeywords items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
