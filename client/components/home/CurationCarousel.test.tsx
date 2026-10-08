/**
 * @vitest-environment jsdom
 */
import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurationCarousel } from "./CurationCarousel";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.mocked(track).mockClear();
});

const items = [
  {
    id: 1,
    title: "가을 장벽",
    description: "보습 성분 모아보기",
    thumbnailImageUrl: "/images/a.jpg",
  },
  {
    id: 2,
    title: "순한 클렌징",
    description: "설페이트 뺀 클렌저",
    thumbnailImageUrl: "/images/b.jpg",
  },
];

/* 컴포넌트의 DROP_DURATION 과 같은 값. 정렬이 끝나는 시점을 알려면 필요하다. */
const DROP_MS = 250;

/* 컴포넌트의 AUTOPLAY_INTERVAL, GLIDE_DURATION 과 같은 값. */
const AUTOPLAY_MS = 5000;
const GLIDE_MS = 1500;

/* 한 칸에서 다음 칸까지의 거리. */
const STEP = 400;

const trackOf = (container: HTMLElement): HTMLElement => {
  const element = container.querySelector(".curation-track");
  if (!(element instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");
  return element;
};

/*
 * jsdom 은 요소의 크기를 모두 0 으로 두므로 칸의 자리를 직접 세워 둔다.
 *
 * 목록 좌우 여백이 16px 이라 첫 칸은 16px 에서 시작한다. 그래서 n 번째 칸을 가운데로
 * 보내는 스크롤 값은 `n × STEP` 이다.
 */
const layOut = (element: HTMLElement) => {
  for (const [slot, child] of [...element.children].entries()) {
    Object.defineProperty(child, "offsetLeft", { value: 16 + slot * STEP, configurable: true });
    Object.defineProperty(child, "offsetWidth", { value: STEP - 8, configurable: true });
  }
  Object.defineProperty(element, "clientWidth", { value: STEP + 24, configurable: true });
  element.setPointerCapture = vi.fn();
  element.hasPointerCapture = vi.fn(() => false);
};

/*
 * 미끄러지는 움직임은 `requestAnimationFrame` 으로 그려진다. 가짜 시간에 맞물려 돌도록
 * 타이머로 바꿔 두고, `performance.now` 도 같은 시간을 읽게 한다. 되돌리는 함수를 돌려준다.
 */
const fakeFrames = () => {
  vi.useFakeTimers();
  const raf = vi
    .spyOn(globalThis, "requestAnimationFrame")
    .mockImplementation((cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number);
  const caf = vi
    .spyOn(globalThis, "cancelAnimationFrame")
    .mockImplementation((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));
  const now = vi.spyOn(performance, "now").mockImplementation(() => Date.now());

  return () => {
    raf.mockRestore();
    caf.mockRestore();
    now.mockRestore();
    vi.useRealTimers();
  };
};

describe("CurationCarousel", () => {
  it("받은 큐레이션의 제목과 설명을 그린다", () => {
    render(<CurationCarousel items={items} />);

    expect(screen.getByText("가을 장벽")).toBeInTheDocument();
    expect(screen.getByText("보습 성분 모아보기")).toBeInTheDocument();
  });

  /*
   * 끝없이 도는 것처럼 보이려고 카드를 복제해 두면, 같은 링크가 여러 번 나와 키보드와
   * 낭독기가 보이지 않는 카드까지 거친다. 받은 카드만 한 번씩 그린다.
   */
  it("받은 큐레이션 수만큼만 카드를 그린다", () => {
    render(<CurationCarousel items={items} />);

    expect(screen.getAllByRole("link")).toHaveLength(items.length);
  });

  /*
   * 큐레이션이 비었다고 통째로 걷어내면 아래의 인기 검색어부터가 위로 올라붙는다. 그러면
   * 큐레이션이 들어오는 순간 화면이 한 번 밀린다. 빈 카드로 자리를 잡아 그 밀림을 막는다.
   */
  it("큐레이션이 없어도 자리를 지킨다", () => {
    const { container } = render(<CurationCarousel items={[]} />);

    const section = container.querySelector("section");

    expect(section).not.toBeNull();
    /* 카드와 같은 높이여야 들어왔을 때 자리가 그대로다. */
    expect(container.querySelector(".aspect-\\[15\\/8\\]")).not.toBeNull();
  });

  /* 사람이 할 일이 없는 자리라 낭독기에서는 읽어 줄 것이 없다. */
  it("빈 자리는 낭독기에서 숨긴다", () => {
    const { container } = render(<CurationCarousel items={[]} />);

    expect(container.querySelector("section")).toHaveAttribute("aria-hidden", "true");
  });

  /*
   * 설명 문구에 넣어 둔 줄바꿈이 공백으로 합쳐지면 의도한 두 줄이 한 줄로 붙는다.
   * 제목과 같은 규칙을 적용해 두었는지 확인한다.
   */
  it("설명 문구의 줄바꿈을 살린다", () => {
    render(<CurationCarousel items={items} />);

    const description = screen.getByText("보습 성분 모아보기");

    expect(description).toHaveClass("whitespace-pre-line");
  });

  /* 캐러셀은 상세 화면으로 가는 입구다. 카드가 실제로 그 주소를 가리키는지 본다. */
  it("카드가 큐레이션 상세로 이어진다", () => {
    render(<CurationCarousel items={items} />);

    const link = screen.getByRole("link", { name: /가을 장벽/ });

    expect(link).toHaveAttribute("href", "/curations/1");
  });

  it("카드를 누르면 몇 번째 큐레이션인지와 함께 남긴다", () => {
    const { container } = render(<CurationCarousel items={items} />);
    const list = trackOf(container);
    layOut(list);
    list.scrollLeft = STEP;

    fireEvent.click(screen.getByRole("link", { name: /순한 클렌징/ }));

    /* 자리는 사람이 세는 대로 1 부터 센다. 두 번째 카드이므로 2 다. */
    expect(track).toHaveBeenCalledWith("curation_opened", { curation_id: 2, position: 2, surface: "home" });
  });

  /*
   * 옆에 걸친 카드는 대개 넘기려고 누른다. 곧바로 상세가 열리면 뜻밖이므로, 그 카드를
   * 가운데로 데려오기만 한다.
   */
  it("옆에 걸친 카드를 누르면 상세로 가지 않고 그 카드로 넘긴다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      const clicked = fireEvent.click(screen.getByRole("link", { name: /순한 클렌징/ }));

      expect(clicked).toBe(false);
      expect(track).not.toHaveBeenCalledWith("curation_opened", expect.anything());

      act(() => vi.advanceTimersByTime(DROP_MS + 32));
      expect(list.scrollLeft).toBe(STEP);
    } finally {
      restore();
    }
  });

  /*
   * 브라우저는 끌기가 끝난 자리에서도 클릭을 한 번 보낸다. 막아 두지 않으면 목록을
   * 밀어 넘길 때마다 상세 화면이 열려, 카드를 넘겨 볼 수가 없다.
   */
  it("끌어서 넘긴 뒤에는 상세로 가지 않는다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    const list = container.querySelector(".curation-track");
    if (!(list instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

    list.setPointerCapture = vi.fn();
    list.hasPointerCapture = vi.fn(() => false);
    list.scrollLeft = 100;

    fireEvent.pointerDown(list, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200 });
    fireEvent.pointerMove(list, { pointerId: 1, pointerType: "mouse", clientX: 140 });
    fireEvent.pointerUp(list, { pointerId: 1, pointerType: "mouse", clientX: 140 });

    const clicked = fireEvent.click(screen.getByRole("link", { name: /가을 장벽/ }));

    /* 기본 동작이 막혔으면 이동하지 않는다. 이벤트도 남기지 않는다. */
    expect(clicked).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  /*
   * 마우스는 요소를 끄는 동작만으로 가로 스크롤을 만들지 않는다. 끈 거리를 직접
   * `scrollLeft` 에 반영하는지 확인한다.
   */
  it("마우스로 끌면 끈 거리만큼 목록이 움직인다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    const track = container.querySelector(".curation-track");
    if (!(track instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

    /* jsdom 은 이 두 가지를 갖추지 않아 끌기 도중에 부르면 멈춘다. */
    track.setPointerCapture = vi.fn();
    track.hasPointerCapture = vi.fn(() => false);
    track.scrollLeft = 100;

    fireEvent.pointerDown(track, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200 });
    fireEvent.pointerMove(track, { pointerId: 1, pointerType: "mouse", clientX: 140 });

    /* 왼쪽으로 60px 끌었으므로 목록은 그만큼 오른쪽으로 흘러간다. */
    expect(track.scrollLeft).toBe(160);
  });

  /*
   * 누를 때 손이 미세하게 흔들리는 것까지 끌기로 받으면, 카드를 눌러 상세 화면으로 갈
   * 때마다 목록이 조금씩 밀린다.
   */
  it("누르는 정도의 미세한 흔들림으로는 움직이지 않는다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    const track = container.querySelector(".curation-track");
    if (!(track instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

    track.setPointerCapture = vi.fn();
    track.hasPointerCapture = vi.fn(() => false);
    track.scrollLeft = 100;

    fireEvent.pointerDown(track, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200 });
    fireEvent.pointerMove(track, { pointerId: 1, pointerType: "mouse", clientX: 197 });

    expect(track.scrollLeft).toBe(100);
  });

  /*
   * 손가락과 펜은 브라우저가 미는 동작을 그대로 가로 스크롤로 바꿔 준다. 그 자리를
   * 가로채면 이미 잘 동작하는 관성과 스냅을 직접 흉내내야 한다.
   */
  it("손가락으로 미는 동작은 브라우저에 맡긴다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    const track = container.querySelector(".curation-track");
    if (!(track instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

    track.setPointerCapture = vi.fn();
    track.hasPointerCapture = vi.fn(() => false);
    track.scrollLeft = 100;

    fireEvent.pointerDown(track, { pointerId: 1, pointerType: "touch", button: 0, clientX: 200 });
    fireEvent.pointerMove(track, { pointerId: 1, pointerType: "touch", clientX: 140 });

    expect(track.scrollLeft).toBe(100);
  });

  /*
   * 스스로 넘어가는 데는 1.5초가 걸려 그 사이에 손을 대는 일이 흔하다. 미끄러지는 동작이
   * 멈추지 않으면 프레임마다 `scrollLeft` 를 적어 손가락이 민 자리를 덮어써, 카드가 튄다.
   */
  it("스스로 넘어가는 중에 손가락을 대면 그 움직임을 멈춘다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      // 스스로 넘기기 시작해 절반쯤 왔다.
      act(() => vi.advanceTimersByTime(AUTOPLAY_MS + GLIDE_MS / 2));
      expect(list.style.scrollSnapType).toBe("none");

      fireEvent.pointerDown(list, { pointerId: 1, pointerType: "touch", button: 0, clientX: 200 });
      const touched = list.scrollLeft;
      act(() => vi.advanceTimersByTime(1000));

      expect(list.scrollLeft).toBe(touched);
      // 손가락으로 민 뒤 브라우저가 카드를 붙이도록 스냅을 돌려 놓는다.
      expect(list.style.scrollSnapType).toBe("");
    } finally {
      restore();
    }
  });

  /*
   * 손가락으로 밀기 시작하면 브라우저는 `pointerup` 대신 `pointercancel` 을 보낸다. 그것을
   * 손을 뗀 것으로 보면 미는 도중에 스스로 넘기기가 출발해 손가락과 다툰다.
   */
  it("손가락이 닿아 있는 동안에는 스스로 넘기지 않는다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      fireEvent.pointerDown(list, { pointerId: 1, pointerType: "touch", button: 0, clientX: 200 });
      fireEvent.pointerCancel(list, { pointerId: 1, pointerType: "touch" });
      // 시계(5초)가 찼다면 미끄러지는 한가운데일 시점이다.
      act(() => vi.advanceTimersByTime(AUTOPLAY_MS + GLIDE_MS / 2));

      expect(list.scrollLeft).toBe(0);

      // 손을 떼면 다음 시계(10초)에 다시 스스로 넘긴다. 그 한가운데다.
      fireEvent.touchEnd(list, { touches: [] });
      act(() => vi.advanceTimersByTime(AUTOPLAY_MS));

      expect(list.scrollLeft).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  /* 끝에서 처음으로 이어 돌지 않으므로, 마지막 카드에서는 첫 카드로 돌아가야 계속 넘어간다. */
  it("스스로 넘기다 마지막 카드에 닿으면 첫 카드로 되감는다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = STEP;

      act(() => vi.advanceTimersByTime(AUTOPLAY_MS + GLIDE_MS / 2));
      expect(list.scrollLeft).toBeLessThan(STEP);

      act(() => vi.advanceTimersByTime(GLIDE_MS / 2 + 32));
      expect(list.scrollLeft).toBe(0);
    } finally {
      restore();
    }
  });

  it("스냅 지점에서 벗어나 멈추면 가운데로 붙인다", () => {
    const restore = fakeFrames();
    const previousScrollEnd = Object.getOwnPropertyDescriptor(window, "onscrollend");
    Object.defineProperty(window, "onscrollend", { value: null, configurable: true });

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);

      // 두 번째 칸이 가운데에 가장 가깝지만 스냅 지점보다 120px 앞에서 멈춘 상황이다.
      list.scrollLeft = STEP - 120;
      fireEvent.scroll(list);
      act(() => vi.advanceTimersByTime(1750));

      // 멎은 순간 곧바로 옮기지 않고, 남은 거리를 미끄러져 간다.
      expect(list.scrollLeft).toBe(STEP - 120);
      act(() => vi.advanceTimersByTime(DROP_MS / 2));
      expect(list.scrollLeft).toBeGreaterThan(STEP - 120);
      // 미끄러짐은 다음 프레임에 출발하므로 한 프레임 넉넉히 기다린다.
      act(() => vi.advanceTimersByTime(DROP_MS / 2 + 32));

      expect(list.scrollLeft).toBe(STEP);
      expect(list).toHaveClass("snap-mandatory");
      expect(list.style.scrollSnapType).toBe("");
    } finally {
      restore();
      if (previousScrollEnd) Object.defineProperty(window, "onscrollend", previousScrollEnd);
      else Reflect.deleteProperty(window, "onscrollend");
    }
  });

  /*
   * 끝 여백을 스크롤 범위에 넣지 않는 브라우저에서는 마지막 칸이 제 스냅 지점까지 가지
   * 못한다. 그 자리를 덜 왔다고 보면 붙이기를 끝없이 되풀이한다.
   */
  it("마지막 카드가 갈 수 있는 끝에 멈추면 붙이기를 되풀이하지 않는다", () => {
    const restore = fakeFrames();
    const previousScrollEnd = Object.getOwnPropertyDescriptor(window, "onscrollend");
    Object.defineProperty(window, "onscrollend", { value: null, configurable: true });

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      const end = STEP - 16;
      Object.defineProperty(list, "scrollWidth", { value: list.clientWidth + end, configurable: true });

      list.scrollLeft = end;
      fireEvent.scroll(list);
      act(() => vi.advanceTimersByTime(1750 + DROP_MS * 2));

      expect(list.scrollLeft).toBe(end);
      expect(track).toHaveBeenCalledWith("curation_slide_viewed", {
        curation_id: 2,
        position: 2,
        transition: "manual",
      });
    } finally {
      restore();
      if (previousScrollEnd) Object.defineProperty(window, "onscrollend", previousScrollEnd);
      else Reflect.deleteProperty(window, "onscrollend");
    }
  });

  /*
   * 끄는 동안에도 스크롤 이벤트가 프레임마다 온다. 손을 멈춘 사이에 멎었다고 보아 카드를
   * 가운데로 붙이면, 붙잡고 있던 카드가 손을 떠나 튄다.
   */
  it("끄는 도중에는 가운데로 붙이지 않는다", () => {
    vi.useFakeTimers();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 100;

      fireEvent.pointerDown(list, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200 });
      fireEvent.pointerMove(list, { pointerId: 1, pointerType: "mouse", clientX: 140 });
      fireEvent.scroll(list);

      const dragged = list.scrollLeft;

      /* 손을 멈춘 채 시간이 흘러도 끌던 자리가 유지되어야 한다. */
      vi.advanceTimersByTime(4000);

      expect(list.scrollLeft).toBe(dragged);
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * 한 칸의 절반을 넘겨야 넘어가면 카드가 화면 폭에 가까워 넘기는 데 힘이 많이 든다.
   * 시작한 칸에서 한 칸의 20% 만 움직여도 다음 카드로 넘어가야 한다.
   */
  it("한 칸의 20% 만 끌어도 다음 카드로 넘어간다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      fireEvent.pointerDown(list, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 300 });
      /* 한 칸의 20%(80px) 를 갓 넘긴다. 절반(200px) 에는 크게 못 미치는 거리다. */
      fireEvent.pointerMove(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 85 });
      fireEvent.pointerUp(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 85 });
      act(() => vi.advanceTimersByTime(DROP_MS + 32));

      expect(list.scrollLeft).toBe(STEP);
    } finally {
      restore();
    }
  });

  /*
   * 손을 뗀 직후가 사람이 가장 눈여겨보는 순간이다. 시작이 느린 커브를 쓰면 그 순간 화면이
   * 멈췄다가 움직이는 것처럼 보인다. 붙는 시간의 5분의 1 만에 거리의 절반 이상을 가야 한다.
   */
  it("손을 뗀 뒤 붙는 움직임은 빠르게 출발한다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      fireEvent.pointerDown(list, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 300 });
      fireEvent.pointerMove(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 100 });
      fireEvent.pointerUp(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 100 });
      act(() => vi.advanceTimersByTime(16 + DROP_MS / 5));

      // 100px 에서 출발해 400px 로 간다. 남은 300px 의 절반을 넘겼다.
      expect(list.scrollLeft).toBeGreaterThan(100 + 150);
    } finally {
      restore();
    }
  });

  /*
   * 빠르게 튕기는 동작은 거리가 짧아 한 칸의 20% 에 못 미친다. 거리만 보면 넘기려던 카드가
   * 제자리로 돌아오므로 속도도 함께 본다.
   */
  it("짧게 튕기면 거리가 모자라도 다음 카드로 넘어간다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      const down = createEvent.pointerDown(list, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 300 });
      fireEvent(list, down);
      /* 한 칸의 20%(80px) 에 크게 못 미치는 30px 을 50ms 만에 움직였다. */
      fireEvent.pointerMove(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 30 });
      const up = createEvent.pointerUp(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 30 });
      Object.defineProperty(up, "timeStamp", { value: down.timeStamp + 50 });
      fireEvent(list, up);
      act(() => vi.advanceTimersByTime(DROP_MS + 32));

      expect(list.scrollLeft).toBe(STEP);
    } finally {
      restore();
    }
  });

  it("천천히 조금만 끌었다 놓으면 제자리로 돌아온다", () => {
    const restore = fakeFrames();

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 0;

      const down = createEvent.pointerDown(list, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 300 });
      fireEvent(list, down);
      /* 같은 30px 을 1초에 걸쳐 움직였다. */
      fireEvent.pointerMove(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 30 });
      const up = createEvent.pointerUp(list, { pointerId: 1, pointerType: "mouse", clientX: 300 - 30 });
      Object.defineProperty(up, "timeStamp", { value: down.timeStamp + 1000 });
      fireEvent(list, up);
      act(() => vi.advanceTimersByTime(DROP_MS + 32));

      expect(list.scrollLeft).toBe(0);
    } finally {
      restore();
    }
  });

  /*
   * 여러 칸을 미끄러져 되돌아가면 지나가는 카드가 한꺼번에 커졌다 줄며 화면이 어수선하다.
   * 되감기는 흐렸다가 옮긴다. jsdom 에는 웹 애니메이션 API 가 없어 곧바로 옮긴다.
   */
  it("세 장 이상에서 마지막 카드에 닿으면 미끄러지지 않고 첫 카드로 옮긴다", () => {
    const restore = fakeFrames();
    const three = [
      ...items,
      { id: 3, title: "맑은 진정", description: "시카 성분 모아보기", thumbnailImageUrl: "/images/c.jpg" },
    ];

    try {
      const { container } = render(<CurationCarousel items={three} />);
      const list = trackOf(container);
      layOut(list);
      list.scrollLeft = 2 * STEP;

      act(() => vi.advanceTimersByTime(AUTOPLAY_MS + 16));

      expect(list.scrollLeft).toBe(0);
    } finally {
      restore();
    }
  });

  /*
   * 마우스로 카드를 끄는 순간 브라우저가 그림을 집어 들면 목록을 미는 동작이 끊긴다.
   */
  it("카드의 그림을 집어 들지 못하게 한다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    for (const image of container.querySelectorAll("img")) {
      expect(image).toHaveAttribute("draggable", "false");
    }
  });

  it("실제로 다른 카드에 도착했을 때만 수동 넘김을 기록한다", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<CurationCarousel items={items} />);
      const trackElement = trackOf(container);
      layOut(trackElement);
      trackElement.scrollLeft = 0;
      vi.mocked(track).mockClear();

      fireEvent.scroll(trackElement);
      act(() => vi.advanceTimersByTime(1750));
      expect(track).not.toHaveBeenCalledWith("curation_slide_viewed", expect.anything());

      trackElement.scrollLeft = STEP;
      fireEvent.scroll(trackElement);
      act(() => vi.advanceTimersByTime(1750));
      expect(track).toHaveBeenCalledWith("curation_slide_viewed", {
        curation_id: 2,
        position: 2,
        transition: "manual",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
