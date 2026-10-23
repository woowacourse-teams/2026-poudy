"use client";

import { RangeSlider, type SliderTone } from "@poudy/design-system/range-slider";
import { ToggleChip } from "@poudy/design-system/toggle-chip";
import { useId, useState } from "react";

import { MAX_LEVEL } from "@/lib/domain/filter";
import { LEVEL_LABELS } from "@/lib/domain/product-display";

type Range = readonly [number, number];

const FULL_RANGE: Range = [0, MAX_LEVEL];

/** 고른 단계 목록을 (최소, 최대)로 바꾼다. 비어 있으면 양 끝이다. */
const rangeOf = (levels: readonly number[]): Range =>
  levels.length === 0 ? FULL_RANGE : [Math.min(...levels), Math.max(...levels)];

/**
 * 요청에 쓸 단계 목록. '상관없음'이 켜졌거나 양 끝(없음~높음)까지 넓히면 조건이 없는 것과 같아 비운다(명세 APP · 범위 슬라이더).
 */
const levelsOf = (any: boolean, [min, max]: Range): readonly number[] => {
  if (any || (min === FULL_RANGE[0] && max === FULL_RANGE[1])) return [];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
};

type LevelOptionProps = {
  /** 소제목이자 슬라이더 이름. 예: '수분감' */
  readonly label: string;
  readonly tone: SliderTone;
  readonly levels: readonly number[];
  readonly onChange: (levels: readonly number[]) => void;
};

/**
 * 유수분 한 항목(명세 APP · 범위 슬라이더). 머리줄 오른쪽 '상관없음' 칩을 켜면 슬라이더를 흐리게 그리고 요청에서 뺀다.
 * '상관없음'이 켜진 채로 슬라이더를 바로 누르거나 끌면 '상관없음'이 풀리고 그 자리의 값이 골라진다. 칩을 먼저 끄지 않아도 된다.
 * 켜도 범위는 기억했다가 끄면 마지막으로 쓰던 범위로 돌아간다. 꺼진 채로 양 끝까지 넓혀도 저절로 켜지지 않는다.
 */
function LevelOption({ label, tone, levels, onChange }: LevelOptionProps) {
  const headingId = useId();
  const [any, setAny] = useState(levels.length === 0);
  const [range, setRange] = useState<Range>(() => rangeOf(levels));

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex h-11 items-center justify-between">
        <h3 id={headingId} className="text-section font-bold text-text-primary">
          {label}
        </h3>
        <ToggleChip
          size="sm"
          pressed={any}
          aria-label={`${label} 상관없음`}
          onPressedChange={(pressed) => {
            setAny(pressed);
            onChange(levelsOf(pressed, range));
          }}
        >
          상관없음
        </ToggleChip>
      </div>
      <RangeSlider
        label={label}
        steps={LEVEL_LABELS}
        value={range}
        tone={tone}
        inactive={any}
        onActivate={() => {
          setAny(false);
          onChange(levelsOf(false, range));
        }}
        onValueChange={(next) => {
          setRange(next);
          onChange(levelsOf(false, next));
        }}
      />
    </section>
  );
}

type LevelOptionsProps = {
  readonly moistureLevel: readonly number[];
  readonly oilLevel: readonly number[];
  readonly onChange: (changed: {
    readonly moistureLevel?: readonly number[];
    readonly oilLevel?: readonly number[];
  }) => void;
};

/** 유수분 시트(명세 S23b). 수분감과 유분감은 서로 다른 조건이라 따로 고른다. */
export function LevelOptions({ moistureLevel, oilLevel, onChange }: LevelOptionsProps) {
  return (
    <div className="flex flex-col gap-6">
      <LevelOption
        label="수분감"
        tone="moisture"
        levels={moistureLevel}
        onChange={(levels) => onChange({ moistureLevel: levels })}
      />
      <LevelOption label="유분감" tone="oil" levels={oilLevel} onChange={(levels) => onChange({ oilLevel: levels })} />
    </div>
  );
}
