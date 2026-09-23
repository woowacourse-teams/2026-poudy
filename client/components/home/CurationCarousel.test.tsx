/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
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
const DROP_MS = 320;

describe("CurationCarousel", () => {
  it("받은 큐레이션의 제목과 설명을 그린다", () => {
    render(<CurationCarousel items={items} />);

    /* 앞뒤로 여벌 카드를 두어 같은 제목이 여러 번 나온다. 하나라도 그려졌으면 된다. */
    expect(screen.getAllByText("가을 장벽").length).toBeGreaterThan(0);
    expect(screen.getAllByText("보습 성분 모아보기").length).toBeGreaterThan(0);
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
    expect(container.querySelector(".h-52")).not.toBeNull();
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

    const [description] = screen.getAllByText("보습 성분 모아보기");

    expect(description).toHaveClass("whitespace-pre-line");
  });

  /* 캐러셀은 상세 화면으로 가는 입구다. 카드가 실제로 그 주소를 가리키는지 본다. */
  it("카드가 큐레이션 상세로 이어진다", () => {
    render(<CurationCarousel items={items} />);

    /* 앞뒤로 여벌 카드를 두어 같은 링크가 여러 번 나온다. 가리키는 곳만 본다. */
    const [link] = screen.getAllByRole("link", { name: /가을 장벽/ });

    expect(link).toHaveAttribute("href", "/curations/1");
  });

  it("카드를 누르면 몇 번째 큐레이션인지와 함께 남긴다", () => {
    render(<CurationCarousel items={items} />);

    const [link] = screen.getAllByRole("link", { name: /순한 클렌징/ });
    fireEvent.click(link);

    /* 자리는 사람이 세는 대로 1 부터 센다. 두 번째 카드이므로 2 다. */
    expect(track).toHaveBeenCalledWith("curation_opened", { curation_id: 2, position: 2, surface: "home" });
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

    const [link] = screen.getAllByRole("link", { name: /가을 장벽/ });
    const clicked = fireEvent.click(link);

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

  it("스냅 지점에서 벗어나 멈추면 가운데로 정렬한 뒤 재배치한다", () => {
    vi.useFakeTimers();
    const raf = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number);
    const caf = vi
      .spyOn(globalThis, "cancelAnimationFrame")
      .mockImplementation((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));
    const now = vi.spyOn(performance, "now").mockImplementation(() => Date.now());
    const previousScrollEnd = Object.getOwnPropertyDescriptor(window, "onscrollend");
    Object.defineProperty(window, "onscrollend", { value: null, configurable: true });

    try {
      const { container } = render(<CurationCarousel items={items} />);
      const track = container.querySelector(".curation-track");
      if (!(track instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

      const step = 400;
      for (const [slot, child] of [...track.children].entries()) {
        Object.defineProperty(child, "offsetLeft", { value: slot * step, configurable: true });
        Object.defineProperty(child, "offsetWidth", { value: step, configurable: true });
      }
      Object.defineProperty(track, "clientWidth", { value: step, configurable: true });

      // 세 번째 칸이 중심에 가장 가깝지만 스냅 지점보다 120px 앞에서 멈춘 상황이다.
      track.scrollLeft = 3 * step - 32 - 120;
      fireEvent.scroll(track);
      vi.advanceTimersByTime(1750);

      // 종료 시점에 즉시 순간이동하지 않고, 먼저 남은 거리를 움직인다.
      expect(track.scrollLeft).toBe(3 * step - 32 - 120);
      vi.advanceTimersByTime(DROP_MS / 2);
      expect(track.scrollLeft).toBeGreaterThan(3 * step - 32 - 120);
      vi.advanceTimersByTime(DROP_MS / 2);

      // 가운데에 도착한 뒤에만 순서를 바꾼다.
      expect(track.scrollLeft).toBe(2 * step - 32);
      expect(track.children[2]).toHaveTextContent("순한 클렌징");
      expect(track).toHaveClass("snap-mandatory");
    } finally {
      raf.mockRestore();
      caf.mockRestore();
      now.mockRestore();
      if (previousScrollEnd) Object.defineProperty(window, "onscrollend", previousScrollEnd);
      else Reflect.deleteProperty(window, "onscrollend");
      vi.useRealTimers();
    }
  });

  /*
   * 끄는 도중에는 카드 순서를 되돌리지 않는다.
   *
   * 이 컴포넌트는 스크롤이 멎으면 순서를 돌리고 스크롤을 가운데로 되돌린다. 끄는 동안에도
   * 스크롤 이벤트가 프레임마다 오기 때문에, 막아 두지 않으면 끌고 있는 도중에 그 되돌림이
   * 실행되어 붙잡고 있던 카드가 손을 떠나 튄다.
   */
  it("끄는 도중에는 스크롤을 되돌리지 않는다", () => {
    vi.useFakeTimers();

    try {
      const { container } = render(<CurationCarousel items={items} />);

      const track = container.querySelector(".curation-track");
      if (!(track instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

      track.setPointerCapture = vi.fn();
      track.hasPointerCapture = vi.fn(() => false);
      track.scrollLeft = 100;

      fireEvent.pointerDown(track, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200 });
      fireEvent.pointerMove(track, { pointerId: 1, pointerType: "mouse", clientX: 140 });
      fireEvent.scroll(track);

      const dragged = track.scrollLeft;

      /* 손을 멈춘 채 시간이 흘러도 끌던 자리가 유지되어야 한다. */
      vi.advanceTimersByTime(4000);

      expect(track.scrollLeft).toBe(dragged);
    } finally {
      vi.useRealTimers();
    }
  });

  /*
   * 한 칸의 절반을 넘겨야 넘어가면 카드가 화면 폭에 가까워 넘기는 데 힘이 많이 든다.
   * 시작한 칸에서 한 칸의 20% 만 움직여도 다음 카드로 넘어가야 한다.
   *
   * jsdom 은 요소의 크기를 모두 0 으로 두므로 칸의 자리를 직접 세워 둔다.
   */
  it("한 칸의 20% 만 끌어도 다음 카드로 넘어간다", () => {
    vi.useFakeTimers();

    /*
     * 정렬 움직임은 `requestAnimationFrame` 으로 그려진다. 가짜 시간에 맞물려 돌도록
     * 타이머로 바꿔 두고, `performance.now` 도 같은 시간을 읽게 한다.
     */
    const raf = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number);
    const caf = vi
      .spyOn(globalThis, "cancelAnimationFrame")
      .mockImplementation((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));
    const now = vi.spyOn(performance, "now").mockImplementation(() => Date.now());

    try {
      runSwitchCase();
    } finally {
      raf.mockRestore();
      caf.mockRestore();
      now.mockRestore();
      vi.useRealTimers();
    }
  });

  const runSwitchCase = () => {
    const { container } = render(<CurationCarousel items={items} />);

    const track = container.querySelector(".curation-track");
    if (!(track instanceof HTMLElement)) throw new Error("목록을 찾지 못했다");

    const step = 400;
    for (const [slot, child] of [...track.children].entries()) {
      if (!(child instanceof HTMLElement)) continue;
      Object.defineProperty(child, "offsetLeft", { value: slot * step, configurable: true });
      Object.defineProperty(child, "offsetWidth", { value: step, configurable: true });
    }
    Object.defineProperty(track, "clientWidth", { value: step, configurable: true });

    track.setPointerCapture = vi.fn();
    track.hasPointerCapture = vi.fn(() => false);
    /* 가운데 칸(SPARE=2)에서 시작한다. 그 칸을 가운데로 보내는 스크롤 값이다. */
    track.scrollLeft = 2 * step - 32;

    fireEvent.pointerDown(track, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 300 });
    /* 한 칸의 20%(80px) 를 갓 넘긴다. 절반(200px) 에는 크게 못 미치는 거리다. */
    fireEvent.pointerMove(track, { pointerId: 1, pointerType: "mouse", clientX: 300 - 85 });
    fireEvent.pointerUp(track, { pointerId: 1, pointerType: "mouse", clientX: 300 - 85 });

    /*
     * 정렬이 끝나면 `settle` 이 카드 순서를 돌리고 스크롤을 가운데 칸으로 되돌리므로,
     * 마지막 스크롤 값으로는 어느 칸을 향했는지 알 수 없다. 정렬이 진행되는 동안의 값을
     * 보고 판정한다. 절반 기준이면 시작한 칸으로 되돌아가 값이 줄어든다.
     */
    const startedAt = track.scrollLeft;
    vi.advanceTimersByTime(Math.floor(DROP_MS / 2));

    expect(track.scrollLeft).toBeGreaterThan(startedAt);
  };

  /*
   * 마우스로 카드를 끄는 순간 브라우저가 그림을 집어 들면 목록을 미는 동작이 끊긴다.
   */
  it("카드의 그림을 집어 들지 못하게 한다", () => {
    const { container } = render(<CurationCarousel items={items} />);

    for (const image of container.querySelectorAll("img")) {
      expect(image).toHaveAttribute("draggable", "false");
    }
  });
});
