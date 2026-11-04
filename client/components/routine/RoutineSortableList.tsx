"use client";

import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";

import { ProductImage } from "@/components/ui/ProductImage";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

/** 손잡이를 이만큼 누르고 있어야 끌기가 시작된다(RT5 '길게 눌러'). */
const LONG_PRESS_MS = 200;

export type RoutineReorder = { readonly from: number; readonly to: number };

type Drag = RoutineReorder & { readonly offset: number };

type Press = {
  readonly pointerId: number;
  readonly index: number;
  readonly startY: number;
  readonly rowHeight: number;
  readonly timer: ReturnType<typeof setTimeout>;
};

type RoutineSortableListProps = {
  readonly products: readonly RoutineProductResponse[];
  /** 놓은 자리로 순서를 바꾼다. 실패하면 거부된 약속을 돌려준다. */
  readonly onReorder: (move: RoutineReorder) => Promise<unknown>;
  readonly onOpenMenu: (product: RoutineProductResponse) => void;
  /** 목록 바로 아래, 안내 문구 위에 둘 것. 구간에 제품을 더하는 줄이 온다. */
  readonly footer?: ReactNode;
};

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

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
export function RoutineSortableList({ products, onReorder, onOpenMenu, footer }: RoutineSortableListProps) {
  const press = useRef<Press | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const [pending, setPending] = useState<{
    readonly source: readonly RoutineProductResponse[];
    readonly order: readonly RoutineProductResponse[];
  } | null>(null);

  // 서버가 돌려준 새 목록이 오면 미리 그린 순서는 버린다.
  let shown = products;
  if (pending && pending.source === products) shown = pending.order;

  const commit = async (move: RoutineReorder) => {
    if (move.from === move.to) return;
    setPending({ source: products, order: reordered(shown, move) });
    try {
      await onReorder(move);
    } catch {
      setPending(null);
    }
  };

  const startPress = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const row = event.currentTarget.closest("li");
    const height = row?.offsetHeight ?? 0;
    const startY = event.clientY;
    const timer = setTimeout(() => {
      setRowHeight(height);
      setDrag({ from: index, to: index, offset: 0 });
      requestSelectionHaptic();
    }, LONG_PRESS_MS);
    press.current = { pointerId: event.pointerId, index, startY, rowHeight: height, timer };
  };

  const movePress = (event: PointerEvent<HTMLButtonElement>) => {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId || !drag || current.rowHeight === 0) return;
    const offset = event.clientY - current.startY;
    const to = clamp(current.index + Math.round(offset / current.rowHeight), shown.length - 1);
    if (to !== drag.to) requestSelectionHaptic();
    setDrag({ from: current.index, to, offset });
  };

  const endPress = (event: PointerEvent<HTMLButtonElement>, drop: boolean) => {
    const current = press.current;
    if (current && current.pointerId !== event.pointerId) return;
    if (current) clearTimeout(current.timer);
    press.current = null;
    if (drag && drop) commit({ from: drag.from, to: drag.to });
    setDrag(null);
  };

  const moveByKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      commit({ from: index, to: index - 1 });
    }
    if (event.key === "ArrowDown" && index < shown.length - 1) {
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
                dragging && "z-(--z-sticky) rounded-lg shadow-(--shadow-raised)",
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
