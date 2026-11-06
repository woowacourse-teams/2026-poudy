/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShelfIntroSpotlight } from "./ShelfIntroSpotlight";

const SEEN_KEY = "poudy.shelf-intro.v1";
const SEEN = JSON.stringify({ version: 1, value: true });
const DEFAULT_AGENT = window.navigator.userAgent;

const page = ({ eligible = true, card = true }: { readonly eligible?: boolean; readonly card?: boolean } = {}) => (
  <>
    <button type="button">위시리스트에 추가</button>
    <div data-shelf-intro="image" />
    <button type="button" data-shelf-intro="save">
      선반에 저장
    </button>
    {card && <section data-shelf-intro="unsuitable">나와 안 맞는 성분</section>}
    <ShelfIntroSpotlight eligible={eligible} />
  </>
);

const dialog = () => screen.queryByRole("dialog", { name: "선반 소개" });

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
};

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: true })),
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  setUserAgent(DEFAULT_AGENT);
});

describe("ShelfIntroSpotlight", () => {
  it("선반에 저장을 비춘 뒤 안 맞는 성분 카드로 넘어갔다가 저절로 사라진다", () => {
    render(page());
    expect(dialog()).toBeNull();

    advance(400);
    expect(dialog()).toHaveTextContent("써 본 제품은 선반에 저장해 두세요");
    expect(window.localStorage.getItem(SEEN_KEY)).toBe(SEEN);

    advance(2000);
    expect(dialog()).toHaveTextContent("안 맞았던 제품이 모이면 겹치는 성분이 보여요");

    advance(2600);
    expect(dialog()).toBeNull();
  });

  it("카드가 없는 제품이면 첫 단계만 보이고 닫힌다", () => {
    render(page({ card: false }));

    advance(400);
    expect(dialog()).toHaveTextContent("써 본 제품은 선반에 저장해 두세요");

    advance(2900);
    expect(dialog()).toBeNull();
  });

  it("떠 있는 동안 화면의 나머지를 막고 닫기로 포커스를 옮긴다", () => {
    const { container } = render(page());
    screen.getByRole("button", { name: "위시리스트에 추가" }).focus();

    advance(400);
    expect(container).toHaveProperty("inert", true);
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
  });

  it("닫기를 누르면 닫히고, 막았던 화면과 포커스를 되돌린다", () => {
    const { container } = render(page());
    const wishlist = screen.getByRole("button", { name: "위시리스트에 추가" });
    wishlist.focus();

    advance(400);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(dialog()).toBeNull();
    expect(container).toHaveProperty("inert", false);
    expect(wishlist).toHaveFocus();
  });

  it("Esc 로 닫는다", () => {
    render(page());

    advance(400);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(dialog()).toBeNull();
  });

  it("닫기가 아닌 곳을 눌러도 닫히지 않는다", () => {
    render(page());

    advance(400);
    fireEvent.click(dialog() as HTMLElement);
    fireEvent.click(screen.getByText("써 본 제품은", { exact: false }));

    expect(dialog()).not.toBeNull();
  });

  it("이 기기에서 이미 보여 줬으면 다시 띄우지 않는다", () => {
    window.localStorage.setItem(SEEN_KEY, SEEN);
    render(page());

    advance(5000);
    expect(dialog()).toBeNull();
  });

  it("대상이 아니면 띄우지 않는다", () => {
    render(page({ eligible: false }));

    advance(5000);
    expect(dialog()).toBeNull();
    expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
  });

  it.each([
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) Chrome/130.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
    "Mozilla/5.0 (compatible; Daum/4.1; +http://cs.daum.net/faq/15/4118.html?faqId=28966)",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 Chrome-Lighthouse",
  ])("검색엔진 봇과 Lighthouse 에는 띄우지 않는다: %s", (agent) => {
    setUserAgent(agent);
    render(page());

    advance(5000);
    expect(dialog()).toBeNull();
  });

  it("선반에 저장 버튼이 화면 밖이면 띄우지 않고 본 것으로 남기지도 않는다", () => {
    render(page());
    vi.spyOn(screen.getByRole("button", { name: "선반에 저장" }), "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, -100, 100, 48),
    );

    advance(5000);
    expect(dialog()).toBeNull();
    expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
  });
});
