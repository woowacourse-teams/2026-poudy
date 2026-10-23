/**
 * @vitest-environment jsdom
 */
import type { RankingItem } from "@poudy/api/api.zod";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PopularKeywords } from "./PopularKeywords";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const items: readonly RankingItem[] = [
  { rank: 1, keyword: "나이아신아마이드", change: { movement: "UP", steps: 2 } },
  { rank: 2, keyword: "어성초", change: { movement: "SAME", steps: 0 } },
  { rank: 3, keyword: "레티놀", change: { movement: "NEW", steps: 0 } },
  { rank: 4, keyword: "세라마이드", change: { movement: "DOWN", steps: 1 } },
];

const toggle = () => screen.getByRole("button", { name: /인기 검색어/ });
const list = () => {
  const element = document.querySelector("ol");
  if (!element) throw new Error("목록을 찾지 못했다");
  return element;
};

beforeEach(() => {
  vi.mocked(track).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PopularKeywords", () => {
  it("접혀 있으면 1위만 보이고 목록은 숨긴다", () => {
    render(<PopularKeywords items={items} />);

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveTextContent("1나이아신아마이드");
    expect(list()).not.toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("바 전체가 펼치기 버튼이다. 펼치면 전체 순위를 목록으로 보여 주고 남긴다", async () => {
    render(<PopularKeywords items={items} />);

    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveAttribute("aria-controls", list().id);
    expect(toggle()).toHaveTextContent("전체 순위 4개");
    expect(
      within(list())
        .getAllByRole("link")
        .map((link) => link.querySelector(".truncate")?.textContent),
    ).toEqual(["나이아신아마이드", "어성초", "레티놀", "세라마이드"]);
    expect(track).toHaveBeenCalledWith("popular_keywords_expanded", { rank: 1 });
  });

  it("순위 변동을 기호로 보이고, 낭독기에는 말로 알린다", async () => {
    render(<PopularKeywords items={items} />);

    // 닫힌 바의 1위 옆에도 변동을 둔다.
    expect(toggle()).toHaveAccessibleName(/2계단 상승/);

    await userEvent.click(toggle());

    const links = within(list()).getAllByRole("link");
    expect(links.map((link) => link.querySelector("[aria-hidden]")?.textContent)).toEqual(["2", "−", "NEW", "1"]);
    expect(links[0]).toHaveAccessibleName("1나이아신아마이드, 2계단 상승");
    expect(links[1]).toHaveAccessibleName("2어성초, 변동 없음");
    expect(links[2]).toHaveAccessibleName("3레티놀, 새로 진입");
    expect(links[3]).toHaveAccessibleName("4세라마이드, 1계단 하락");
  });

  it("다시 누르면 접는다. 접을 때는 남기지 않는다", async () => {
    render(<PopularKeywords items={items} />);

    await userEvent.click(toggle());
    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("검색어를 누르면 그 말의 검색 결과로 가고 순위를 남긴다", async () => {
    render(<PopularKeywords items={items} />);
    await userEvent.click(toggle());

    const link = screen.getByRole("link", { name: /레티놀/ });
    expect(link).toHaveAttribute("href", "/products?keyword=%EB%A0%88%ED%8B%B0%EB%86%80");

    await userEvent.click(link);
    expect(track).toHaveBeenCalledWith("popular_keyword_used", { keyword: "레티놀", rank: 3, placement: "expanded" });
  });

  it("위 세 순위만 브랜드 색으로 칠한다", async () => {
    render(<PopularKeywords items={items} />);
    await userEvent.click(toggle());

    expect(screen.getByText("3")).toHaveClass("text-brand-text");
    expect(screen.getByText("4")).toHaveClass("text-text-secondary");
  });

  it("시간이 지나도 닫힌 바의 순위를 돌리지 않는다", () => {
    vi.useFakeTimers();
    render(<PopularKeywords items={items} />);

    act(() => vi.advanceTimersByTime(20_000));

    expect(toggle()).toHaveTextContent("1나이아신아마이드");
  });

  it("panel 은 처음부터 펼쳐 두고, 접을 수도 있다", async () => {
    render(<PopularKeywords items={items} variant="panel" />);

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(list()).toBeVisible();

    await userEvent.click(toggle());
    expect(list()).not.toBeVisible();
  });

  it("검색어가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<PopularKeywords items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
