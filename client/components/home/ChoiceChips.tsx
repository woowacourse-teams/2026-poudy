"use client";

import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";

export type ChoiceChipOption<T> = {
  readonly value: T;
  readonly label: string;
};

type ChoiceChipsProps<T> = {
  /** 묶음의 이름. 보이는 섹션 제목이 있으면 그 id 를 aria-labelledby 로 가리킨다. */
  readonly "aria-labelledby"?: string;
  readonly "aria-label"?: string;
  readonly options: readonly ChoiceChipOption<T>[];
  readonly selected: T;
  readonly onSelect: (option: ChoiceChipOption<T>) => void;
};

/**
 * 하나만 고르는 칩 줄(명세 S20 '카테고리 필터 칩'). 홈의 사람들이 보는 제품과 큐레이션 상세의 필터 블록이 쓴다.
 *
 * 높이 32 · 좌우 12 · 13/600 이다. 고른 칩은 검은 면(fb-dim), 나머지는 흰 면과 ui-border-strong 테두리(fb-surface)다.
 * 누르는 순간 선택 모양이 바뀌므로 크기 피드백은 두지 않는다(STATE S07). 누르는 영역은 위아래로 6 씩 넓혀 44 다(A11Y D12).
 *
 * 줄이 넘치면 다음 줄로 흘린다. 거터 밖으로 빼는 음수 여백을 쓰지 않기 때문이다.
 */
export function ChoiceChips<T extends string | number | null>({
  options,
  selected,
  onSelect,
  ...name
}: ChoiceChipsProps<T>) {
  return (
    <div role="group" {...name} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ChoiceChip
          key={option.value ?? "all"}
          label={option.label}
          pressed={option.value === selected}
          onPress={() => onSelect(option)}
        />
      ))}
    </div>
  );
}

function ChoiceChip({
  label,
  pressed,
  onPress,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onPress: () => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...pressableProps}
      onClick={onPress}
      className={cn(
        "pressable inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-body-sm leading-none font-semibold whitespace-nowrap select-none after:absolute after:inset-x-0 after:-inset-y-1.5",
        pressed
          ? "fb-dim border-text-primary bg-action text-action-text"
          : "fb-surface border-border-strong bg-background text-text-primary",
      )}
    >
      {label}
    </button>
  );
}
