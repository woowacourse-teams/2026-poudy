"use client";

import { useRef } from "react";

import { LEVEL_LABELS } from "@/lib/domain/product-display";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

type LevelRangeProps = {
  readonly label: string;
  /** 고른 단계. 비어 있으면 상관없음이다. */
  readonly levels: readonly number[];
  readonly onChange: (levels: readonly number[]) => void;
};

const MAX_LEVEL = LEVEL_LABELS.length - 1;

/**
 * 디자인의 유수분 4단계 범위 트랙.
 * 최소와 최대 자리에는 테두리 있는 손잡이를, 그 사이에는 채운 점을 둔다.
 */
export function LevelRange({ label, levels, onChange }: LevelRangeProps) {
  const anyLevel = levels.length === 0;
  const min = anyLevel ? 0 : Math.min(...levels);
  const max = anyLevel ? MAX_LEVEL : Math.max(...levels);

  /** 누른 자리에서 가까운 쪽 끝을 옮긴다. */
  const pick = (level: number) => {
    const next = anyLevel
      ? // 상관없음에서 처음 고를 때는 없음부터 그 자리까지 잡는다. 한 단계만 남기면
        // 그 단계에 딱 맞는 제품만 남아, 조건을 좁히려던 것보다 크게 좁혀진다.
        range(0, level)
      : level < min
        ? range(level, max)
        : level > max
          ? range(min, level)
          : level - min <= max - level
            ? range(level, max)
            : range(min, level);

    // 범위가 그대로면 떨지 않는다. 같은 손잡이를 다시 눌러도 아무것도 옮겨지지 않는다.
    if (!isSameRange(levels, next)) requestSelectionHaptic();
    onChange(next);
  };

  const toggleAnyLevel = () => {
    requestSelectionHaptic();
    onChange(anyLevel ? range(0, MAX_LEVEL) : []);
  };

  /*
   * 손가락으로 끌어 범위를 잡는다. 점을 하나씩 누르는 것보다 빠르고, 잡아끄는 동안
   * 단계를 지날 때마다 떨어 몇 칸을 옮겼는지 손끝으로 알 수 있다.
   */
  const trackRef = useRef<HTMLDivElement>(null);
  /*
   * 끄는 동안의 상태. 렌더 때의 levels·min·max 를 보면 안 된다. 끄는 사이에 값이
   * 바뀌어도 이미 만들어진 함수는 옛 값을 들고 있어 엉뚱한 자리를 기준으로 삼는다.
   *
   * - anchor: 잡지 않은 쪽 끝. 놓을 때까지 그대로다.
   * - sent: 마지막으로 넘긴 범위. 같은 값을 두 번 넘기지 않으려고 둔다.
   */
  const dragging = useRef<{ readonly anchor: number; sent: readonly number[] } | null>(null);
  /** 직전에 알린 단계. 같은 칸 안에서 손가락이 흔들려도 다시 떨지 않으려고 둔다. */
  const lastNotified = useRef<number | null>(null);
  /*
   * 포인터로 이미 옮겼는지. 트랙이 pointerdown 에서 범위를 잡으므로 뒤이어 오는
   * 버튼 click 까지 처리하면 한 번 누른 것이 두 번 반영된다. 키보드로 누른 click 은
   * 앞선 pointerdown 이 없으므로 이 표가 서지 않아 그대로 지나간다.
   */
  const handledByPointer = useRef(false);

  /** 손가락이 놓인 가로 위치에서 단계를 읽는다. */
  const levelAt = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;

    const { left, width } = track.getBoundingClientRect();
    if (width === 0) return null;

    const ratio = (clientX - left) / width;
    return Math.min(MAX_LEVEL, Math.max(0, Math.round(ratio * MAX_LEVEL)));
  };

  const applyDrag = (level: number) => {
    const drag = dragging.current;
    if (drag === null) return;

    // 잡은 손잡이가 반대쪽을 넘어가면 둘이 자리를 바꾼다. 작은 쪽이 늘 앞이다.
    const next = level <= drag.anchor ? range(level, drag.anchor) : range(drag.anchor, level);

    if (lastNotified.current !== level) {
      requestSelectionHaptic();
      lastNotified.current = level;
    }

    if (!isSameRange(drag.sent, next)) {
      drag.sent = next;
      onChange(next);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const level = levelAt(event.clientX);
    if (level === null) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    handledByPointer.current = true;

    if (anyLevel) {
      // 상관없음에서 잡으면 없음부터 그 자리까지 잡는다. 없음 쪽이 고정 자리가 된다.
      const next = range(0, level);
      dragging.current = { anchor: 0, sent: next };
      lastNotified.current = level;
      requestSelectionHaptic();
      onChange(next);
      return;
    }

    // 가까운 손잡이를 잡고, 반대쪽 끝을 고정 자리로 삼는다.
    dragging.current = { anchor: level - min <= max - level ? max : min, sent: levels };
    lastNotified.current = null;
    applyDrag(level);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null) return;

    const level = levelAt(event.clientX);
    if (level !== null) applyDrag(level);
  };

  const endDrag = () => {
    dragging.current = null;
    lastNotified.current = null;
  };

  return (
    <section className="py-3">
      <div className="flex h-[30px] items-center justify-between">
        <h3 className="text-[14px] font-bold text-text-primary">{label}</h3>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={anyLevel}
            onChange={toggleAnyLevel}
            className="size-[18px] rounded border-[1.5px] border-[#C4C7CC] accent-[#212124]"
          />
          <span className="text-[13px] font-medium text-text-secondary">상관없음</span>
        </label>
      </div>

      <p className="flex h-5 items-center gap-1.5">
        <span className="text-[12px] font-medium text-text-secondary">현재 범위</span>
        <span className="text-[13px] font-bold text-text-primary">{anyLevel ? "상관없음" : rangeLabel(min, max)}</span>
      </p>

      {/*
        touch-none 이 있어야 손가락으로 끌 때 화면이 함께 스크롤되지 않는다.
        점 하나하나는 여전히 눌러서도 고를 수 있다.
      */}
      <div
        ref={trackRef}
        role="group"
        aria-label={`${label} 범위`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex h-6 touch-none items-center"
      >
        {LEVEL_LABELS.map((name, level) => {
          const isHandle = !anyLevel && (level === min || level === max);
          const inRange = !anyLevel && level >= min && level <= max;

          return (
            <div key={name} className="flex items-center" style={level < MAX_LEVEL ? { flex: 1 } : undefined}>
              <button
                type="button"
                aria-pressed={inRange}
                aria-label={`${label} ${name}`}
                onClick={() => {
                  // 포인터가 이미 옮겼으면 그 클릭은 흘려보낸다.
                  if (handledByPointer.current) {
                    handledByPointer.current = false;
                    return;
                  }
                  pick(level);
                }}
                className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-[transform,border-color,background-color] duration-control-state ease-standard motion-reduce:transition-none active:scale-90 motion-reduce:active:scale-100 ${
                  isHandle ? "border-brand bg-background" : "border-transparent"
                }`}
              >
                {/*
                  손잡이는 작은 점, 범위 안은 큰 점이다. 크기를 size 로 바꾸면 자리가
                  다시 잡히므로 한 크기로 두고 scale 로 줄인다.
                */}
                <span
                  className={`size-2 rounded-full transition-[transform,background-color] duration-control-state ease-standard motion-reduce:transition-none ${
                    isHandle ? "scale-75 bg-brand" : inRange ? "bg-brand" : "bg-border"
                  }`}
                />
              </button>

              {level < MAX_LEVEL ? (
                <span
                  aria-hidden="true"
                  className={`h-[3px] flex-1 rounded-sm transition-colors duration-control-state ease-standard motion-reduce:transition-none ${
                    !anyLevel && level >= min && level < max ? "bg-brand" : "bg-border"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex h-5 items-center">
        {LEVEL_LABELS.map((name, level) => {
          const inRange = !anyLevel && level >= min && level <= max;
          const isHandle = !anyLevel && (level === min || level === max);

          return (
            <span
              key={name}
              className={`text-[12px] transition-colors duration-control-state ease-standard motion-reduce:transition-none ${
                level < MAX_LEVEL ? "flex-1" : ""
              } ${
                isHandle
                  ? "font-bold text-text-primary"
                  : inRange
                    ? "font-semibold text-text-primary"
                    : "font-medium text-text-secondary"
              }`}
            >
              {name}
            </span>
          );
        })}
      </div>
    </section>
  );
}

const range = (from: number, to: number): readonly number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** 두 범위가 같은 단계를 담는지. 눌러도 범위가 그대로면 손끝에 알릴 것이 없다. */
const isSameRange = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((level, index) => level === b[index]);

const rangeLabel = (min: number, max: number): string =>
  min === max ? LEVEL_LABELS[min] : `${LEVEL_LABELS[min]}–${LEVEL_LABELS[max]}`;
