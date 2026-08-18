"use client";

import { LEVEL_LABELS } from "@/lib/domain/product-display";

type LevelRangeProps = {
  readonly label: string;
  /** 고른 단계. 비어 있으면 상관없음이다. */
  readonly levels: readonly number[];
  readonly onChange: (levels: readonly number[]) => void;
};

const MAX_LEVEL = LEVEL_LABELS.length - 1;

/**
 * 디자인의 유수분 범위 선택. 최소와 최대 손잡이를 각각 움직여 범위를 정한다.
 * 아무것도 고르지 않으면 상관없음이다.
 */
export function LevelRange({ label, levels, onChange }: LevelRangeProps) {
  const anyLevel = levels.length === 0;
  const min = anyLevel ? 0 : Math.min(...levels);
  const max = anyLevel ? MAX_LEVEL : Math.max(...levels);

  /** 한쪽 손잡이를 움직인다. 서로를 넘어가지 않게 막는다. */
  const move = (edge: "min" | "max", value: number) => {
    const next = edge === "min" ? [Math.min(value, max), max] : [min, Math.max(value, min)];
    onChange(range(next[0], next[1]));
  };

  return (
    <section className="py-3">
      <div className="flex h-[30px] items-center justify-between">
        <h3 className="text-[14px] font-bold text-text-primary">{label}</h3>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={anyLevel}
            onChange={() => onChange(anyLevel ? range(0, MAX_LEVEL) : [])}
            className="size-[18px] rounded border-[#C4C7CC] accent-[#212124]"
          />
          <span className="text-[13px] font-medium text-text-secondary">상관없음</span>
        </label>
      </div>

      <p className="flex h-5 items-center gap-1.5">
        <span className="text-[12px] font-medium text-text-secondary">현재 범위</span>
        <span className="text-[13px] font-bold text-text-primary">{anyLevel ? "상관없음" : rangeLabel(min, max)}</span>
      </p>

      {/* 두 손잡이를 겹쳐 두고 트랙은 그 아래에 그린다. */}
      <div className="relative h-6 pt-2">
        <span
          aria-hidden="true"
          className="absolute inset-x-2.5 top-1/2 h-[3px] -translate-y-1/2 rounded-sm bg-border"
        />
        <span
          aria-hidden="true"
          className={`absolute top-1/2 h-[3px] -translate-y-1/2 rounded-sm ${anyLevel ? "bg-border" : "bg-brand"}`}
          style={{
            left: `calc(10px + ${(min / MAX_LEVEL) * 100}% - ${(min / MAX_LEVEL) * 20}px)`,
            right: `calc(10px + ${((MAX_LEVEL - max) / MAX_LEVEL) * 100}% - ${((MAX_LEVEL - max) / MAX_LEVEL) * 20}px)`,
          }}
        />

        <RangeInput label={`${label} 최소`} value={min} onChange={(value) => move("min", value)} dimmed={anyLevel} />
        <RangeInput label={`${label} 최대`} value={max} onChange={(value) => move("max", value)} dimmed={anyLevel} />
      </div>

      <div className="flex pt-1">
        {LEVEL_LABELS.map((name, level) => {
          const inRange = !anyLevel && level >= min && level <= max;
          return (
            <span
              key={name}
              className={`flex-1 text-[12px] last:flex-none ${
                inRange ? "font-bold text-text-primary" : "font-medium text-text-secondary"
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

/**
 * 겹쳐 둔 두 개의 range 입력 중 하나.
 * 트랙은 따로 그리므로 입력 자체는 손잡이만 보이게 한다.
 */
function RangeInput({
  label,
  value,
  onChange,
  dimmed,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly dimmed: boolean;
}) {
  return (
    <input
      type="range"
      min={0}
      max={MAX_LEVEL}
      step={1}
      value={value}
      aria-label={label}
      aria-valuetext={LEVEL_LABELS[value]}
      onChange={(event) => onChange(Number(event.target.value))}
      className={`absolute inset-x-0 top-2 h-5 w-full appearance-none bg-transparent
        [&::-webkit-slider-runnable-track]:h-5 [&::-webkit-slider-runnable-track]:bg-transparent
        [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-white
        [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full
        [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-white
        ${dimmed ? "[&::-webkit-slider-thumb]:border-border [&::-moz-range-thumb]:border-border" : "[&::-webkit-slider-thumb]:border-brand [&::-moz-range-thumb]:border-brand"}`}
      style={{ pointerEvents: "none" }}
    />
  );
}

const range = (from: number, to: number): readonly number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

const rangeLabel = (min: number, max: number): string =>
  min === max ? LEVEL_LABELS[min] : `${LEVEL_LABELS[min]}–${LEVEL_LABELS[max]}`;
