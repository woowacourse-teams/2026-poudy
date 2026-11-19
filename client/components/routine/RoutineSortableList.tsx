"use client";

import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";

import { ProductImage } from "@/components/ui/ProductImage";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

/** 손잡이를 이만큼 누르고 있어야 끌기가 시작된다(RT5 '길게 눌러'). */
const LONG_PRESS_MS = 200;

/** 끄는 손가락이 보이는 영역의 위·아래 끝에서 이만큼(px) 안에 들어오면 그쪽으로 스크롤한다(MOTION M02). 행 하나 높이쯤이다. */
export const EDGE_ZONE = 80;

/** 손가락이 보이는 영역의 끝에 닿거나 넘었을 때의 스크롤 속도(px/s). 60Hz 에서 한 프레임에 12px 이다. */
export const MAX_EDGE_SCROLL_SPEED = 720;

/** 한 프레임이 이보다 길어도(탭 전환, 버벅임) 이만큼만 움직여, 다시 그릴 때 화면이 한꺼번에 튀지 않게 한다. */
const MAX_FRAME_MS = 50;

/** 끄는 행이 머물 수 있는 화면 세로 범위(clientY). 붙은 탭 줄 아래부터 창 아래 끝까지다. */
export type VisibleArea = { readonly top: number; readonly bottom: number };

export type RoutineReorder = { readonly from: number; readonly to: number };

type Drag = RoutineReorder & { readonly offset: number };

/** 누르고 있는 동안의 상태. 끌기가 시작되면 스크롤 기준과 행 위치를 채우고, 손가락과 놓을 자리를 매번 고쳐 적는다. */
type Press = {
  readonly pointerId: number;
  readonly index: number;
  readonly startY: number;
  readonly rowHeight: number;
  readonly timer: ReturnType<typeof setTimeout>;
  dragging: boolean;
  startScrollY: number;
  rowTop: number;
  pointerY: number;
  to: number;
};

type RoutineSortableListProps = {
  readonly products: readonly RoutineProductResponse[];
  /** 놓은 자리로 순서를 바꾼다. 실패하면 거부된 약속을 돌려준다. */
  readonly onReorder: (move: RoutineReorder) => Promise<unknown>;
  readonly onOpenMenu: (product: RoutineProductResponse) => void;
  /** 목록 바로 아래, 안내 문구 위에 둘 것. 구간에 제품을 더하는 줄이 온다. */
  readonly footer?: ReactNode;
  /** 끄는 동안 매 프레임 재는 보이는 영역. 없으면 창 전체다. */
  readonly visibleArea?: () => VisibleArea;
};

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

const windowArea = (): VisibleArea => ({ top: 0, bottom: window.innerHeight });

/**
 * 끄는 손가락 위치(clientY)에 맞는 자동 스크롤 속도(px/s). 위는 음수, 아래는 양수, 가장자리 띠 밖은 0 이다.
 * 띠 안에서는 끝에 가까울수록 곧게 빨라지고, 끝에 닿거나 넘으면 가장 빠르다. 영역이 낮으면 띠를 절반으로 줄여 위아래가 겹치지 않게 한다.
 */
export const edgeScrollSpeed = (pointerY: number, area: VisibleArea): number => {
  const zone = Math.min(EDGE_ZONE, (area.bottom - area.top) / 2);
  if (zone <= 0) return 0;
  const intoTop = area.top + zone - pointerY;
  if (intoTop > 0) return -MAX_EDGE_SCROLL_SPEED * Math.min(intoTop / zone, 1);
  const intoBottom = pointerY - (area.bottom - zone);
  if (intoBottom > 0) return MAX_EDGE_SCROLL_SPEED * Math.min(intoBottom / zone, 1);
  return 0;
};

/** 끄는 동안 행이 비켜설 거리. 끄는 행은 손가락을 따라가고, 지나친 행은 한 칸씩 반대로 밀린다. */
const shiftOf = (index: number, drag: Drag | null, rowHeight: number): number => {
  if (!drag) return 0;
  if (index === drag.from) return drag.offset;
  if (drag.from < drag.to && index > drag.from && index <= drag.to) return -rowHeight;
  if (drag.from > drag.to && index >= drag.to && index < drag.from) return rowHeight;
  return 0;
};

const reordered = (products: readonly RoutineProductResponse[], { from, to }: RoutineReorder) => {
  const rest = products.filter((_, index) => index !== from);
  return [...rest.slice(0, to), products[from], ...rest.slice(to)];
};

/**
 * 내 루틴 상세의 구간 제품(RT4·RT5). 손잡이를 길게 눌러 끌어 놓으면 바르는 순서가 바뀐다.
 * 놓자마자 바뀐 순서로 그리고, 저장에 실패하면 원래 순서로 돌아간다. 키보드는 손잡이에서 위·아래 방향키로 한 칸씩 옮긴다.
 */
export function RoutineSortableList({
  products,
  onReorder,
  onOpenMenu,
  footer,
  visibleArea = windowArea,
}: RoutineSortableListProps) {
  const press = useRef<Press | null>(null);
  const scrollFrame = useRef(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const [pending, setPending] = useState<{
    readonly source: readonly RoutineProductResponse[];
    readonly order: readonly RoutineProductResponse[];
  } | null>(null);

  // 서버가 돌려준 새 목록이 오면 미리 그린 순서는 버린다.
  let shown = products;
  if (pending && pending.source === products) shown = pending.order;
  const last = shown.length - 1;

  // 끄는 도중에 화면을 떠나면 길게 누르기 타이머와 자동 스크롤을 멈춘다.
  useEffect(
    () => () => {
      if (press.current) clearTimeout(press.current.timer);
      cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );

  const commit = async (move: RoutineReorder) => {
    if (move.from === move.to) return;
    setPending({ source: products, order: reordered(shown, move) });
    try {
      await onReorder(move);
    } catch {
      setPending(null);
    }
  };

  /**
   * 손가락과 스크롤로 끄는 행의 자리를 다시 정한다. 문서가 스크롤한 만큼 offset 에 더해 행이 손가락 밑에 머물게 하고,
   * 행이 보이는 영역 밖(탭 줄 밑, 창 아래 끝 너머)으로 나가지 않게 막는다. 놓을 자리는 막힌 뒤의 행 위치로 정한다.
   */
  const follow = (current: Press) => {
    const scrolled = window.scrollY - current.startScrollY;
    const area = visibleArea();
    const highest = area.top - current.rowTop + scrolled;
    const lowest = area.bottom - current.rowHeight - current.rowTop + scrolled;
    let offset = current.pointerY - current.startY + scrolled;
    if (highest <= lowest) offset = Math.min(Math.max(offset, highest), lowest);
    const to = clamp(current.index + Math.round(offset / current.rowHeight), last);
    if (to !== current.to) requestSelectionHaptic();
    current.to = to;
    setDrag({ from: current.index, to, offset });
  };

  const stopEdgeScroll = () => {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0;
  };

  /**
   * 손가락이 가장자리 띠에 있는 동안 매 프레임 스크롤한다. 손가락이 멈춰 있어도 포인터 이벤트 없이 계속 스크롤하므로,
   * 행 자리도 여기서 다시 정한다. 띠를 벗어나거나 문서 끝에 닿으면 멈추고, 손가락이 다시 띠에 들어오면 새로 시작한다.
   * 줄인 움직임 설정에서도 그대로 한다. 꾸밈이 아니라 끌기를 이어 가는 기능이다.
   */
  const startEdgeScroll = () => {
    if (scrollFrame.current) return;
    let previous: number | undefined;
    let carry = 0;
    const tick = (time: number) => {
      scrollFrame.current = 0;
      const current = press.current;
      if (!current?.dragging) return;
      const speed = edgeScrollSpeed(current.pointerY, visibleArea());
      const end = document.documentElement.scrollHeight - window.innerHeight;
      if (speed === 0 || (speed < 0 && window.scrollY <= 0) || (speed > 0 && window.scrollY >= end - 1)) return;
      const elapsed = previous === undefined ? 1000 / 60 : Math.min(time - previous, MAX_FRAME_MS);
      previous = time;
      // 스크롤 위치는 정수로 반올림되는 환경이 있어, 1px 이 모일 때까지 남은 거리를 들고 간다.
      carry += (speed * elapsed) / 1000;
      const step = Math.trunc(carry);
      if (step !== 0) {
        carry -= step;
        window.scrollBy({ top: step, behavior: "instant" });
        follow(current);
      }
      scrollFrame.current = requestAnimationFrame(tick);
    };
    scrollFrame.current = requestAnimationFrame(tick);
  };

  const startPress = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const row = event.currentTarget.closest("li");
    const height = row?.offsetHeight ?? 0;
    const startY = event.clientY;
    const timer = setTimeout(() => {
      const current = press.current;
      if (!current) return;
      current.dragging = true;
      current.startScrollY = window.scrollY;
      current.rowTop = row?.getBoundingClientRect().top ?? 0;
      setRowHeight(height);
      setDrag({ from: index, to: index, offset: 0 });
      requestSelectionHaptic();
    }, LONG_PRESS_MS);
    press.current = {
      pointerId: event.pointerId,
      index,
      startY,
      rowHeight: height,
      timer,
      dragging: false,
      startScrollY: 0,
      rowTop: 0,
      pointerY: startY,
      to: index,
    };
  };

  const movePress = (event: PointerEvent<HTMLButtonElement>) => {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId || !current.dragging || current.rowHeight === 0) return;
    current.pointerY = event.clientY;
    follow(current);
    if (edgeScrollSpeed(current.pointerY, visibleArea()) !== 0) startEdgeScroll();
  };

  const endPress = (event: PointerEvent<HTMLButtonElement>, drop: boolean) => {
    const current = press.current;
    if (current && current.pointerId !== event.pointerId) return;
    if (current) clearTimeout(current.timer);
    stopEdgeScroll();
    press.current = null;
    if (current?.dragging && drop) commit({ from: current.index, to: current.to });
    setDrag(null);
  };

  const moveByKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      commit({ from: index, to: index - 1 });
    }
    if (event.key === "ArrowDown" && index < last) {
      event.preventDefault();
      commit({ from: index, to: index + 1 });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {shown.map((product, index) => {
          const dragging = drag?.from === index;
          const style = { "--routine-row-shift": `${shiftOf(index, drag, rowHeight)}px` } as CSSProperties;
          return (
            <li
              key={product.id}
              style={style}
              className={cn(
                "relative translate-y-(--routine-row-shift) bg-background",
                // 끄는 행은 이웃 행 위에만 뜨는 올림 층이다. 고정 층(상단 내비·탭 줄·하단 내비)과 같은 층이면 DOM 순서가 겹침을
                // 정해, 앞에 있는 상단 내비와 탭 줄은 덮고 뒤에 있는 하단 내비 밑으로만 지나간다(#1259). 끄는 행은 보이는
                // 영역 끝에서 멈추고 화면이 따라 스크롤하므로(follow), 고정 층 밑으로 들어가지도 않는다.
                dragging && "z-(--z-raised) rounded-lg shadow-(--shadow-raised)",
                !dragging && drag && "transition-transform duration-(--duration-fast) ease-out",
                !dragging && "border-b border-border",
              )}
            >
              <div className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  aria-label={`${product.name} 순서 바꾸기`}
                  aria-describedby="routine-sort-hint"
                  onPointerDown={(event) => startPress(event, index)}
                  onPointerMove={movePress}
                  onPointerUp={(event) => endPress(event, true)}
                  onPointerCancel={(event) => endPress(event, false)}
                  onKeyDown={(event) => moveByKey(event, index)}
                  onContextMenu={(event) => event.preventDefault()}
                  className={cn(
                    "flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md select-none",
                    dragging ? "text-text-primary" : "text-text-muted",
                  )}
                >
                  <Icon name="grip-vertical" size={20} />
                </button>
                <span className="w-4 shrink-0 text-center text-body font-semibold text-text-secondary">
                  {index + 1}
                </span>
                <span className="overflow-hidden rounded-md bg-surface">
                  <ProductImage src={product.imageUrl} size={64} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
                  <span className="truncate text-body font-semibold text-text-primary">{product.name}</span>
                </span>
                <ProductMenuButton name={product.name} onOpen={() => onOpenMenu(product)} />
              </div>
            </li>
          );
        })}
      </ol>
      {footer}
      <p id="routine-sort-hint" className="text-caption text-text-secondary">
        {drag ? "놓을 자리에서 손을 떼면 순서가 바뀌어요." : "손잡이를 길게 눌러 끌면 바르는 순서를 바꿀 수 있어요."}
      </p>
    </div>
  );
}

function ProductMenuButton({ name, onOpen }: { readonly name: string; readonly onOpen: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      {...pressableProps}
      type="button"
      aria-label={`${name} 더보기`}
      aria-haspopup="dialog"
      onClick={onOpen}
      className="pressable fb-surface flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary"
    >
      <Icon name="dots-vertical" size={20} />
    </button>
  );
}
