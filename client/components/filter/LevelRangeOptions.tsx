"use client";

import { LEVEL_LABELS } from "@/lib/domain/product-display";

type LevelRangeProps = {
  readonly label: string;
  /** 고른 단계. 비어 있으면 상관없음이다. */
  readonly levels: readonly number[];
  readonly onChange: (levels: readonly number[]) => void;
};

/**
 * 디자인의 유수분 범위 선택. 최소와 최대를 골라 그 사이를 모두 담는다.
 * 아무것도 고르지 않으면 상관없음이다.
 */
export function LevelRange({ label, levels, onChange }: LevelRangeProps) {
  const anyLevel = levels.length === 0;
  const min = anyLevel ? undefined : Math.min(...levels);
  const max = anyLevel ? undefined : Math.max(...levels);

  /** 단계를 누르면 가까운 쪽 끝을 그 자리로 옮긴다. */
  const pick = (level: number) => {
    if (min === undefined || max === undefined) {
      onChange([level]);
      return;
    }
    if (level < min) return onChange(range(level, max));
    if (level > max) return onChange(range(min, level));
    // 안쪽을 누르면 더 가까운 끝을 당긴다.
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
            onChange={() => onChange([])}
            className="size-[18px] rounded border-[#C4C7CC] accent-[#212124]"
          />
          <span className="text-[13px] font-medium text-text-secondary">상관없음</span>
        </label>
      </div>

      <p className="flex h-5 items-center gap-1.5">
        <span className="text-[12px] font-medium text-text-secondary">현재 범위</span>
        <span className="text-[13px] font-bold text-text-primary">{anyLevel ? "상관없음" : rangeLabel(min, max)}</span>
      </p>

      <div role="group" aria-label={`${label} 범위`} className="flex items-center pt-2">
        {LEVEL_LABELS.map((name, level) => {
          const inRange = !anyLevel && min !== undefined && max !== undefined && level >= min && level <= max;
          const isEnd = level === min || level === max;

          return (
            <div key={name} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                aria-pressed={inRange}
                aria-label={`${label} ${name}`}
                onClick={() => pick(level)}
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  isEnd ? "border-brand bg-white" : "border-transparent"
                }`}
              >
                <span
                  className={`rounded-full ${isEnd ? "size-1.5 bg-brand" : inRange ? "size-2 bg-brand" : "size-2 bg-border"}`}
                />
              </button>

              {level < LEVEL_LABELS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`h-[3px] flex-1 rounded-sm ${
                    !anyLevel && min !== undefined && max !== undefined && level >= min && level < max
                      ? "bg-brand"
                      : "bg-border"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex pt-1">
        {LEVEL_LABELS.map((name, level) => {
          const inRange = !anyLevel && min !== undefined && max !== undefined && level >= min && level <= max;
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

const range = (from: number, to: number): readonly number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

const rangeLabel = (min?: number, max?: number): string => {
  if (min === undefined || max === undefined) return "상관없음";
  return min === max ? LEVEL_LABELS[min] : `${LEVEL_LABELS[min]}–${LEVEL_LABELS[max]}`;
};
