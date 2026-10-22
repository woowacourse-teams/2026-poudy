"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

import { cn } from "./cn";
import type { SliderTone } from "./range-slider";

const TONE = {
  moisture: {
    fill: "bg-droplet-moisture",
    outline: "border-droplet-moisture-text",
    text: "text-droplet-moisture-text",
  },
  oil: { fill: "bg-droplet-oil", outline: "border-droplet-oil-text", text: "text-droplet-oil-text" },
} as const;

export type SliderProps = {
  /** 접근 가능한 이름. 예: '수분감' */
  readonly label: string;
  /** 지금 값. null 이면 아직 고르지 않은 상태로, 손잡이와 채움 없이 '선택 전'을 적는다. */
  readonly value: number | null;
  readonly onValueChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** 숫자를 적을 자리. 기본은 min~max 사이의 정수다. */
  readonly marks?: readonly number[];
  /** 채움과 손잡이의 색. 수분은 droplet-moisture, 유분은 droplet-oil 이다. */
  readonly tone: SliderTone;
  /**
   * 값 줄과 보조 기술에 적을 말. 비우면 숫자다. 유수분 평가는 단계 이름('보통', 반 칸은 '보통~높음')을 쓴다(S52e-1).
   */
  readonly formatValue?: (value: number) => string;
  /** 눈금 아래 글. 비우면 숫자다. 유수분 평가는 '없음 · 낮음 · 보통 · 높음'이다. */
  readonly formatMark?: (mark: number) => string;
  /** 양 끝 설명. 예: '건조해요' · '촉촉해요' */
  readonly startLabel?: ReactNode;
  readonly endLabel?: ReactNode;
  /** 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** 값을 고르기 전에 적는 말. 화면과 보조 기술이 같은 말을 쓴다. */
const EMPTY_TEXT = "선택 전";

/**
 * 한 값 슬라이더(명세 APP · 유수분 평가 슬라이더, 2026-10-08 회의). 기본은 0~3 을 0.5 단위 7단계로 고른다.
 *
 * 오른쪽 위에 지금 값을 적고, 트랙 아래에 숫자와 양 끝 설명을 둔다. 탭·끌기·키보드(←→ 한 단위, Home/End 끝)가 같은 값을
 * 만든다. 끄는 동안 손잡이는 손가락을 따라 움직이고, 손을 떼면 가장 가까운 단계에 붙는다.
 * 세로 스크롤과 확대는 브라우저에 맡긴다(touch-action: pan-y pinch-zoom, STATE S09). 다만 손잡이를 잡고 끌 때는
 * 손가락이 위아래로 흔들려도 화면이 따라 움직이지 않게 손잡이만 touch-action: none 으로 둔다. touch-action 은 조상과의
 * 교집합이라 손잡이에서 시작한 끌기만 스크롤을 막고, 트랙의 다른 자리를 스치면 지금처럼 화면이 스크롤된다.
 *
 * 값이 null 이면 고르기 전이다(명세 S52i). 손잡이와 채움을 그리지 않고 값 자리를 비운다. 보조 기술에는 '선택 전'으로 알린다. 트랙을 누르거나
 * 끌면 그 자리의 값이 되고, 키보드는 min 에서 출발한 것처럼 움직인다(→ 는 min + step, ← 와 Home 은 min, End 는 max).
 * 그동안 포커스는 트랙 전체가 받아 링도 트랙을 따라 그린다.
 */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 3,
  step = 0.5,
  marks,
  tone,
  startLabel,
  endLabel,
  formatValue = format,
  formatMark = format,
  className,
}: SliderProps) {
  const stepCount = Math.round((max - min) / step);
  const ticks = Array.from({ length: stepCount + 1 }, (_, index) => min + index * step);
  const numbers = marks ?? ticks.filter(Number.isInteger);
  const ratioOf = useCallback((current: number) => (current - min) / (max - min), [min, max]);

  const areaRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dragging = useRef<number | null>(null);

  const draw = useCallback((ratio: number | null) => {
    if (fillRef.current) fillRef.current.style.width = ratio === null ? "0%" : `${ratio * 100}%`;
    // 고르기 전에는 포커스 받는 자리가 트랙 전체(inset-0)라 위치를 비운다.
    if (handleRef.current) handleRef.current.style.left = ratio === null ? "" : `${ratio * 100}%`;
  }, []);

  const empty = value === null;

  useLayoutEffect(() => {
    draw(value === null ? null : ratioOf(value));
  }, [draw, ratioOf, value]);

  useLayoutEffect(() => {
    numbers.forEach((mark, index) => {
      const element = markRefs.current[index];
      if (element) element.style.left = `${ratioOf(mark) * 100}%`;
    });
  });

  const snap = (ratio: number) => clamp(min + Math.round((ratio * (max - min)) / step) * step, min, max);
  const ratioAt = (clientX: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  };
  const change = (next: number) => {
    if (next !== value) onValueChange(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragging.current = event.pointerId;
    handleRef.current?.focus({ preventScroll: true });
    const ratio = ratioAt(event.clientX);
    draw(ratio);
    change(snap(ratio));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current !== event.pointerId) return;
    const ratio = ratioAt(event.clientX);
    draw(ratio);
    change(snap(ratio));
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current !== event.pointerId) return;
    dragging.current = null;
    draw(value === null ? null : ratioOf(value));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? min;
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? current - step
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? current + step
          : event.key === "Home"
            ? min
            : event.key === "End"
              ? max
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    change(clamp(next, min, max));
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/*
        값 줄의 높이는 늘 text-title 한 줄이다. 고르기 전에는 비워 두되 높이는 남겨, 값을 골라도 트랙이 밀리지 않는다.
        고르기 전이라는 것은 손잡이와 채움이 없는 것으로 보이고, 보조 기술에는 '선택 전'으로 알린다(S52e-1).
      */}
      <p aria-hidden="true" className={cn("text-right text-title leading-snug font-bold", TONE[tone].text)}>
        {value === null ? "\u00a0" : formatValue(value)}
      </p>

      {/* 손잡이 반지름(12)만큼 양옆을 비워, 양 끝 값에서도 손잡이가 트랙 밖으로 나가지 않는다. */}
      <div className="px-3">
        <div
          ref={areaRef}
          // 끄는 동안 손가락이 아래로 흔들려도 시트가 따라 내려가지 않게 시트 끌기에서 뺀다.
          data-sheet-no-drag=""
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          className="relative h-7 cursor-pointer touch-pan-y touch-pinch-zoom select-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 -mx-0.75 flex -translate-y-1/2 justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="size-1.5 rounded-full bg-border-strong" />
            ))}
          </div>
          <div
            ref={fillRef}
            className={cn("absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full", TONE[tone].fill)}
          />

          <div
            ref={handleRef}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value ?? undefined}
            aria-valuetext={value === null ? EMPTY_TEXT : formatValue(value)}
            onKeyDown={onKeyDown}
            /*
              누르는 영역은 44 원이고, 보이는 손잡이는 24 다(A11Y D12). 포커스 링은 보이는 손잡이에 그린다.
              고르기 전에는 손잡이가 없으므로 트랙 전체가 포커스를 받고 링도 트랙에 그린다.
            */
            className={
              empty
                ? "absolute inset-0 rounded-full"
                : "absolute top-1/2 flex size-11 -translate-1/2 touch-none items-center justify-center rounded-full"
            }
          >
            {empty ? null : (
              <span
                data-focus-ring=""
                className={cn("size-6 rounded-full border-2 bg-background", TONE[tone].outline)}
              />
            )}
          </div>
        </div>

        <div aria-hidden="true" className="relative h-4.25">
          {numbers.map((mark, index) => (
            <span
              key={mark}
              ref={(element) => {
                markRefs.current[index] = element;
              }}
              className="absolute top-0 -translate-x-1/2 text-caption leading-snug font-medium whitespace-nowrap text-text-secondary"
            >
              {formatMark(mark)}
            </span>
          ))}
        </div>
      </div>

      {startLabel || endLabel ? (
        <div className="flex justify-between text-caption text-text-muted">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
