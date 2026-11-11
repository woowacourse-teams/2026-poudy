/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
      파우치에 저장
    </button>
    {card && <section data-shelf-intro="unsuitable">나와 안 맞는 성분</section>}
    <ShelfIntroSpotlight eligible={eligible} />
  </>
);

const dialog = () => screen.queryByRole("dialog", { name: "파우치 소개" });

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: true })),
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setUserAgent(DEFAULT_AGENT);
});

describe("ShelfIntroSpotlight", () => {
  it("파우치에 저장을 비춘 뒤 안 맞는 성분 카드로 넘어간 뒤 자동으로 닫힌다", () => {
    const { container } = render(page());
    const wishlist = screen.getByRole("button", { name: "위시리스트에 추가" });
    wishlist.focus();
    expect(dialog()).toBeNull();

    advance(400);
    expect(dialog()).toHaveTextContent("써 본 제품은 파우치에 저장해 두세요");
    expect(window.localStorage.getItem(SEEN_KEY)).toBe(SEEN);

    advance(2000);
    expect(dialog()).toHaveTextContent("안 맞았던 제품이 모이면 겹치는 성분이 보여요");

    advance(2299);
    expect(dialog()).not.toBeNull();
    advance(1);
    expect(dialog()).toBeNull();
    expect(container).toHaveProperty("inert", false);
    expect(wishlist).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("카드가 없는 제품이면 첫 단계 뒤 자동으로 닫힌다", () => {
    render(page({ card: false }));

    advance(400);
    expect(dialog()).toHaveTextContent("써 본 제품은 파우치에 저장해 두세요");

    advance(2600);
    expect(dialog()).toBeNull();
  });

  it("떠 있는 동안 화면의 나머지를 막고 닫기로 포커스를 옮긴다", () => {
    const { container } = render(page());
    screen.getByRole("button", { name: "위시리스트에 추가" }).focus();

    advance(400);
    expect(container).toHaveProperty("inert", true);
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "설명 건너뛰기" })).toHaveFocus();
  });

  it("닫기를 누르면 닫히고, 막았던 화면과 포커스를 되돌린다", () => {
    const { container } = render(page());
    const wishlist = screen.getByRole("button", { name: "위시리스트에 추가" });
    wishlist.focus();

    advance(400);
    fireEvent.click(screen.getByRole("button", { name: "설명 건너뛰기" }));

    expect(dialog()).toBeNull();
    expect(container).toHaveProperty("inert", false);
    expect(document.documentElement.style.overflow).toBe("");
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

  it("휠과 터치 이동을 막지만 하단 버튼은 누를 수 있다", () => {
    render(page());
    advance(400);
    const overlay = dialog() as HTMLElement;
    expect(fireEvent.wheel(overlay)).toBe(false);
    expect(fireEvent.touchMove(overlay)).toBe(false);
    const skip = screen.getByRole("button", { name: "설명 건너뛰기" });
    fireEvent.keyDown(skip, { key: "Tab" });
    expect(skip).toHaveFocus();
    fireEvent.click(skip);
    advance(5000);
    expect(dialog()).toBeNull();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("소개 중 화면을 떠나면 기존 스크롤 설정과 배경 조작을 복원한다", () => {
    document.documentElement.style.overflow = "scroll";
    document.documentElement.style.scrollPaddingBottom = "40px";
    const { container, unmount } = render(page());
    advance(400);
    expect(document.documentElement.style.overflow).toBe("hidden");
    unmount();
    expect(document.documentElement.style.overflow).toBe("scroll");
    expect(document.documentElement.style.scrollPaddingBottom).toBe("40px");
    document.documentElement.style.scrollPaddingBottom = "";
    expect(container).toHaveProperty("inert", false);
    document.documentElement.style.overflow = "";
    advance(5000);
    expect(dialog()).toBeNull();
  });

  it.each(["자동 종료", "건너뛰기", "Esc"])("%s 후 소개 전 스크롤 위치로 즉시 돌아온다", (exit) => {
    vi.spyOn(window, "scrollX", "get").mockReturnValue(12);
    const scrollY = vi.spyOn(window, "scrollY", "get").mockReturnValue(240);
    render(page());
    advance(400);

    // 두 번째 설명으로 이동한 위치를 원래 위치로 다시 저장하면 안 된다.
    scrollY.mockReturnValue(900);
    advance(2000);
    expect(window.scrollTo).not.toHaveBeenCalled();

    if (exit === "자동 종료") advance(2300);
    if (exit === "건너뛰기") fireEvent.click(screen.getByRole("button", { name: "설명 건너뛰기" }));
    if (exit === "Esc") fireEvent.keyDown(window, { key: "Escape" });

    expect(dialog()).toBeNull();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 12, top: 240, behavior: "instant" });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("다음 설명은 부드럽게 이동하고 종료할 때만 즉시 원래 위치로 돌아온다", () => {
    render(page());
    advance(400);
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest", behavior: "instant" });
    // 썸네일 이동 시간이 지난 뒤 모션 설정을 바꿔 설명 이동만 확인한다.
    advance(1700);
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    advance(300);
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest", behavior: "smooth" });
    expect(window.scrollTo).not.toHaveBeenCalled();
    advance(2300);
    expect(window.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0, behavior: "instant" });
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

  it("파우치에 저장 버튼이 화면 밖이면 띄우지 않고 본 것으로 남기지도 않는다", () => {
    render(page());
    vi.spyOn(screen.getByRole("button", { name: "파우치에 저장" }), "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, -100, 100, 48),
    );

    advance(5000);
    expect(dialog()).toBeNull();
    expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
  });
});
