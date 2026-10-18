/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CurationCarousel } from "./CurationCarousel";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const items = [
  {
    id: 101,
    target: { type: "CURATION" as const, curationId: 1 },
    title: "가을 장벽",
    description: "보습 성분 모아보기",
    imageUrl: "/images/a.jpg",
  },
  {
    id: 102,
    target: { type: "CURATION" as const, curationId: 2 },
    title: "순한 클렌징",
    description: "설페이트 뺀 클렌저",
    imageUrl: "/images/b.jpg",
  },
];

/*
 * jsdom 에는 IntersectionObserver 가 없다. 만든 것을 붙들어 두고 테스트가 '이 칸이 가운데에 왔다'를 직접 알린다.
 */
let observer: { callback: IntersectionObserverCallback; targets: Element[] } | undefined;

/* 섹션 노출을 재는 관찰자(useHomeSectionView)도 함께 만들어진다. 목록을 root 로 둔 칸 관찰자만 붙든다. */
class FakeIntersectionObserver {
  private readonly mine: { callback: IntersectionObserverCallback; targets: Element[] } | undefined;
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    if (!options?.root) return;
    this.mine = { callback, targets: [] };
    observer = this.mine;
  }
  observe(target: Element) {
    this.mine?.targets.push(target);
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

/** n 번째 칸이 가운데에 왔다고 알린다. */
const center = (slide: number) =>
  act(() => {
    const target = observer?.targets[slide];
    if (!observer || !target) throw new Error("칸을 찾지 못했다");
    observer.callback(
      [{ target, isIntersecting: true, intersectionRatio: 1 } as unknown as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    );
  });

const scrollIntoView = vi.fn();
const scrollBy = vi.fn();

beforeEach(() => {
  observer = undefined;
  vi.mocked(track).mockClear();
  scrollIntoView.mockClear();
  scrollBy.mockClear();
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Element.prototype.scrollIntoView = scrollIntoView;
  Element.prototype.scrollBy = scrollBy as unknown as Element["scrollBy"];
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const listOf = () => {
  const list = screen.getByRole("region", { name: "큐레이션" }).querySelector("ul");
  if (!list) throw new Error("목록을 찾지 못했다");
  return list;
};

describe("CurationCarousel", () => {
  it("맨 앞에 서비스 소개로 가는 장을 두고, 그 뒤에 큐레이션을 받은 순서대로 둔다", () => {
    render(<CurationCarousel items={items} />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/about", "/curations/1", "/curations/2"]);
    expect(links[0]).toHaveTextContent("서비스 가이드");
  });

  it("가이드 장을 끄고 큐레이션도 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<CurationCarousel items={[]} withGuide={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("가운데 가이드 장을 누르면 큐레이션과 따로 서비스 가이드 열기를 남긴다", () => {
    render(<CurationCarousel items={items} />);

    fireEvent.click(screen.getByRole("link", { name: /서비스 가이드/ }));

    expect(track).toHaveBeenCalledWith("service_guide_opened", { surface: "home" });
    expect(track).not.toHaveBeenCalledWith("curation_opened", expect.anything());
  });

  it("가운데 카드를 누르면 몇 번째 큐레이션인지와 함께 남긴다. 자리는 큐레이션끼리 센다", () => {
    render(<CurationCarousel items={items} />);
    center(2);

    const link = screen.getByRole("link", { name: /순한 클렌징/ });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(link, event);

    expect(event.defaultPrevented).toBe(false);
    expect(track).toHaveBeenCalledWith("curation_opened", { curation_id: 2, position: 2, surface: "home" });
  });

  it("옆에 걸친 카드를 누르면 상세로 가지 않고 그 카드를 가운데로 데려온다", () => {
    render(<CurationCarousel items={items} />);

    const link = screen.getByRole("link", { name: /가을 장벽/ });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(link, event);

    expect(event.defaultPrevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ inline: "center" }));
    expect(track).not.toHaveBeenCalledWith("curation_opened", expect.anything());
  });

  it("다른 큐레이션 카드가 가운데에 오면 한 번만 남긴다. 가이드 장은 세지 않는다", () => {
    render(<CurationCarousel items={items} />);

    center(1);
    center(1);
    center(0);

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("curation_slide_viewed", { curation_id: 1, position: 1, transition: "manual" });
    expect(screen.getByText("큐레이션 1 / 3")).toBeInTheDocument();
  });

  it("마우스로 끌면 끈 만큼 목록을 밀고, 놓으면 옆 카드로 붙인다", () => {
    render(<CurationCarousel items={items} />);
    const list = listOf();

    fireEvent.pointerDown(list, { pointerType: "mouse", button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(list, { pointerType: "mouse", pointerId: 1, clientX: 290 });
    fireEvent.pointerMove(list, { pointerType: "mouse", pointerId: 1, clientX: 240 });
    fireEvent.pointerUp(list, { pointerType: "mouse", pointerId: 1, clientX: 240 });

    expect(scrollBy).toHaveBeenLastCalledWith({ left: 50 });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(list.style.scrollSnapType).toBe("");
  });

  it("누르는 정도의 미세한 흔들림으로는 움직이지 않는다", () => {
    render(<CurationCarousel items={items} />);
    const list = listOf();

    fireEvent.pointerDown(list, { pointerType: "mouse", button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(list, { pointerType: "mouse", pointerId: 1, clientX: 297 });
    fireEvent.pointerUp(list, { pointerType: "mouse", pointerId: 1, clientX: 297 });

    expect(scrollBy).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("손가락으로 미는 동작은 브라우저에 맡긴다", () => {
    render(<CurationCarousel items={items} />);
    const list = listOf();

    fireEvent.pointerDown(list, { pointerType: "touch", button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(list, { pointerType: "touch", pointerId: 1, clientX: 200 });

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("끌어서 넘긴 뒤 뒤따르는 클릭으로는 상세로 가지 않는다", () => {
    render(<CurationCarousel items={items} />);
    const list = listOf();

    fireEvent.pointerDown(list, { pointerType: "mouse", button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(list, { pointerType: "mouse", pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(list, { pointerType: "mouse", pointerId: 1, clientX: 200 });

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole("link", { name: /서비스 가이드/ }), event);

    expect(event.defaultPrevented).toBe(true);
    expect(track).not.toHaveBeenCalledWith("service_guide_opened", expect.anything());
  });

  it("스스로 넘기지 않는다", () => {
    vi.useFakeTimers();
    render(<CurationCarousel items={items} />);

    act(() => vi.advanceTimersByTime(20_000));

    expect(scrollBy).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("카드 사진의 sizes 는 그려지는 카드 폭이다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    expect(container.querySelector("img")).toHaveAttribute(
      "sizes",
      "(max-width: 359px) calc(100vw - 60px), (min-width: 448px) 380px, calc(100vw - 68px)",
    );
  });
});
