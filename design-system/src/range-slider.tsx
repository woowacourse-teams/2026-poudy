"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { cn } from "./cn";

type Handle = "min" | "max";
export type SliderTone = "moisture" | "oil";

const TONE = {
  moisture: { fill: "bg-droplet-moisture", outline: "border-droplet-moisture-text" },
  oil: { fill: "bg-droplet-oil", outline: "border-droplet-oil-text" },
} as const;

const COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" } as const;

/** 끌기를 시작하고 이만큼 움직여야 겹친 손잡이 가운데 어느 쪽을 움직일지 정한다. */
const DIRECTION_THRESHOLD = 3;

export type RangeSliderProps = {
  /** 값의 이름. 손잡이 이름과 낭독에 쓴다(예: '수분감' → '수분감 최소 보통'). 보이는 머리줄은 화면이 그린다. */
  readonly label: string;
  /** 단계 이름. 왼쪽부터 0, 1, 2 … 이다(예: 없음 · 낮음 · 보통 · 높음). 2~6개. */
  readonly steps: readonly string[];
  /** (최소, 최대) 단계. 늘 최소 ≤ 최대이고, 같은 단계도 된다. */
  readonly value: readonly [number, number];
  readonly onValueChange: (value: readonly [number, number]) => void;
  /** 선택 구간의 색. 수분은 droplet-moisture, 유분은 droplet-oil 이다. */
  readonly tone: SliderTone;
  /**
   * 막힌 상태. '상관없음'이 켜졌을 때다. 구간과 눈금은 ui-border-strong, 손잡이는 ui-surface 면 + ui-disabled-text 윤곽,
   * 단계 이름은 ui-disabled-text 가 된다. 터치와 키보드 포커스를 막는다.
   */
  readonly disabled?: boolean;
  /** 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/**
 * 범위 슬라이더(명세 APP · 범위 슬라이더의 슬라이더 부분, A11Y D01). 손잡이 두 개로 단계 사이의 범위를 고른다.
 *
 * - 끌기: 손잡이는 손가락을 따라 움직이고, 값은 가장 가까운 단계로 바뀐다. 손을 떼면 그 단계에 붙는다. 손잡이끼리는
 *   교차하지 않고 상대 손잡이 자리에서 멈춘다. 겹친 손잡이는 오른쪽으로 끌면 최대, 왼쪽으로 끌면 최소가 움직인다.
 * - 트랙이나 단계 이름을 누르면 가까운 손잡이가 그 단계로 옮겨 간다. 거리가 같으면 그 단계가 범위보다 오른쪽이면 최대,
 *   왼쪽이면 최소가 간다.
 * - 키보드: 손잡이마다 slider 이고 최소 → 최대 순서로 포커스된다. ←/→ 한 단계, Home/End 는 끝이나 상대 손잡이까지.
 *
 * 세로 스크롤과 확대는 브라우저에 맡기고 가로 끌기만 직접 처리한다(touch-action: pan-y pinch-zoom, STATE S09).
 */
export function RangeSlider({
  label,
  steps,
  value,
  onValueChange,
  tone,
  disabled = false,
  className,
}: RangeSliderProps) {
  const count = steps.length;
  const [min, max] = value;
  const last = count - 1;
  const position = useCallback((step: number) => (step + 0.5) / count, [count]);

  const areaRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const handleRefs = { min: useRef<HTMLDivElement>(null), max: useRef<HTMLDivElement>(null) };
  const drag = useRef<{ pointerId: number; startX: number; handle: Handle | undefined } | null>(null);

  // 그리는 자리. 값이 바뀌면 단계 자리에, 끄는 동안에는 손가락 자리에 놓는다.
  const draw = useCallback(
    (low: number, high: number) => {
      const set = (element: HTMLElement | null, left: number, width?: number) => {
        if (!element) return;
        element.style.left = `${left * 100}%`;
        if (width !== undefined) element.style.width = `${width * 100}%`;
      };
      set(trackRef.current, position(0), position(last) - position(0));
      set(fillRef.current, low, high - low);
      set(handleRefs.min.current, low);
      set(handleRefs.max.current, high);
    },
    // handleRefs 의 ref 객체는 그릴 때마다 같다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [position, last],
  );

  useLayoutEffect(() => {
    draw(position(min), position(max));
  }, [draw, position, min, max]);

  const change = (handle: Handle, step: number) => {
    const next: readonly [number, number] =
      handle === "min" ? [clamp(step, 0, max), max] : [min, clamp(step, min, last)];
    if (next[0] !== min || next[1] !== max) onValueChange(next);
  };

  /** 그 단계로 옮길 손잡이. 가까운 쪽이고, 거리가 같으면 오른쪽 단계는 최대, 왼쪽 단계는 최소가 간다. */
  const nearest = (step: number): Handle => {
    const toMin = Math.abs(step - min);
    const toMax = Math.abs(step - max);
    if (toMin !== toMax) return toMin < toMax ? "min" : "max";
    return step > max ? "max" : step < min ? "min" : "max";
  };

  const ratioAt = (clientX: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  };
  const stepAt = (ratio: number) => clamp(Math.round(ratio * count - 0.5), 0, last);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const grabbed = (event.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle as
      Handle | undefined;

    if (grabbed && min === max) {
      // 겹친 손잡이는 끄는 방향을 보고 정한다.
      drag.current = { pointerId: event.pointerId, startX: event.clientX, handle: undefined };
      return;
    }
    const step = stepAt(ratioAt(event.clientX));
    const handle = grabbed ?? nearest(step);
    if (!grabbed) change(handle, step);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, handle };
    handleRefs[handle].current?.focus({ preventScroll: true });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;

    if (!current.handle) {
      const moved = event.clientX - current.startX;
      if (Math.abs(moved) < DIRECTION_THRESHOLD) return;
      current.handle = moved > 0 ? "max" : "min";
      handleRefs[current.handle].current?.focus({ preventScroll: true });
    }

    const ratio = ratioAt(event.clientX);
    const low = current.handle === "min" ? clamp(ratio, position(0), position(max)) : position(min);
    const high = current.handle === "max" ? clamp(ratio, position(min), position(last)) : position(max);
    draw(low, high);
    change(current.handle, stepAt(ratio));
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    // 끄는 동안 손가락 자리에 있던 손잡이를 값의 단계 자리로 돌려놓는다.
    draw(position(min), position(max));
  };

  const onKeyDown = (handle: Handle) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = handle === "min" ? min : max;
    const low = handle === "min" ? 0 : min;
    const high = handle === "min" ? max : last;
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? current - 1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? current + 1
          : event.key === "Home"
            ? low
            : event.key === "End"
              ? high
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    change(handle, clamp(next, low, high));
  };

  const inRange = (step: number) => step >= min && step <= max;
  const columns = COLUMNS[count as keyof typeof COLUMNS];
  const summary = min === max ? `${label} ${steps[min]}만` : `${label} ${steps[min]}부터 ${steps[max]}까지`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        ref={areaRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        className={cn("relative h-8 touch-pan-y touch-pinch-zoom select-none", !disabled && "cursor-pointer")}
      >
        <div ref={trackRef} className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
        <div
          ref={fillRef}
          className={cn(
            "absolute top-1/2 h-1 -translate-y-1/2 rounded-full",
            disabled ? "bg-border-strong" : TONE[tone].fill,
          )}
        />

        <div aria-hidden="true" className={cn("absolute inset-0 grid items-center justify-items-center", columns)}>
          {steps.map((step, index) => (
            <span
              key={step}
              className={cn(
                "size-2.5 rounded-full border-2",
                !inRange(index)
                  ? "border-border-strong bg-background"
                  : disabled
                    ? "border-background bg-border-strong"
                    : cn("border-background", TONE[tone].fill),
              )}
            />
          ))}
        </div>

        {(["min", "max"] as const).map((handle) => {
          const step = handle === "min" ? min : max;
          const name = `${label} ${handle === "min" ? "최소" : "최대"}`;
          return (
            <div
              key={handle}
              ref={handleRefs[handle]}
              data-handle={handle}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={name}
              aria-valuemin={0}
              aria-valuemax={last}
              aria-valuenow={step}
              aria-valuetext={`${name} ${steps[step]}`}
              aria-disabled={disabled || undefined}
              onKeyDown={onKeyDown(handle)}
              /* 누르는 영역은 44 원이고, 보이는 손잡이는 26 이다(A11Y D12). 포커스 링은 보이는 손잡이에 그린다. */
              className="absolute top-1/2 flex size-11 -translate-1/2 items-center justify-center rounded-full"
            >
              <span
                data-focus-ring=""
                className={cn(
                  "size-6.5 rounded-full border-2",
                  disabled ? "border-disabled-text bg-surface" : cn("bg-background", TONE[tone].outline),
                )}
              />
            </div>
          );
        })}
      </div>

      {/* 단계 이름. 누르면 가까운 손잡이가 옮겨 간다(끌기의 대안). 같은 일을 키보드는 손잡이로 하므로 낭독에서 뺀다. */}
      <div aria-hidden="true" className={cn("grid", columns)}>
        {steps.map((step, index) => (
          <button
            key={step}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => change(nearest(index), index)}
            className={cn(
              "text-center text-body-sm leading-snug disabled:opacity-100",
              disabled
                ? "font-medium text-disabled-text"
                : inRange(index)
                  ? "font-semibold text-text-primary"
                  : "font-medium text-text-muted",
            )}
          >
            {step}
          </button>
        ))}
      </div>

      <p role="status" className="sr-only">
        {disabled ? "" : summary}
      </p>
    </div>
  );
}
