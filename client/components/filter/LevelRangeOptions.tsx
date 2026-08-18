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
 * 디자인의 유수분 4단계 범위 트랙.
 * 최소와 최대 자리에는 테두리 있는 손잡이를, 그 사이에는 채운 점을 둔다.
 */
export function LevelRange({ label, levels, onChange }: LevelRangeProps) {
  const anyLevel = levels.length === 0;
  const min = anyLevel ? 0 : Math.min(...levels);
  const max = anyLevel ? MAX_LEVEL : Math.max(...levels);

  /** 누른 자리에서 가까운 쪽 끝을 옮긴다. */
  const pick = (level: number) => {
    if (anyLevel) return onChange([level]);
    if (level < min) return onChange(range(level, max));
    if (level > max) return onChange(range(min, level));
    return onChange(level - min <= max - level ? range(level, max) : range(min, level));
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
            className="size-[18px] rounded border-[1.5px] border-[#C4C7CC] accent-[#212124]"
          />
          <span className="text-[13px] font-medium text-text-secondary">상관없음</span>
        </label>
      </div>

      <p className="flex h-5 items-center gap-1.5">
        <span className="text-[12px] font-medium text-text-secondary">현재 범위</span>
        <span className="text-[13px] font-bold text-text-primary">{anyLevel ? "상관없음" : rangeLabel(min, max)}</span>
      </p>

      <div role="group" aria-label={`${label} 범위`} className="flex h-6 items-center">
        {LEVEL_LABELS.map((name, level) => {
          const isHandle = !anyLevel && (level === min || level === max);
          const inRange = !anyLevel && level >= min && level <= max;

          return (
            <div key={name} className="flex items-center" style={level < MAX_LEVEL ? { flex: 1 } : undefined}>
              <button
                type="button"
                aria-pressed={inRange}
                aria-label={`${label} ${name}`}
                onClick={() => pick(level)}
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  isHandle ? "border-2 border-brand bg-background" : ""
                }`}
              >
                <span
                  className={`rounded-full ${
                    isHandle ? "size-1.5 bg-brand" : inRange ? "size-2 bg-brand" : "size-2 bg-border"
                  }`}
                />
              </button>

              {level < MAX_LEVEL ? (
                <span
                  aria-hidden="true"
                  className={`h-[3px] flex-1 rounded-sm ${
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
              className={`text-[12px] ${level < MAX_LEVEL ? "flex-1" : ""} ${
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

const rangeLabel = (min: number, max: number): string =>
  min === max ? LEVEL_LABELS[min] : `${LEVEL_LABELS[min]}–${LEVEL_LABELS[max]}`;
