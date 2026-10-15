"use client";

import type { RatingPreference } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useId } from "react";

const CHOICES = [
  { value: "GOOD", label: "잘 맞았어요" },
  { value: "BAD", label: "안 맞았어요" },
] as const satisfies readonly { readonly value: RatingPreference; readonly label: string }[];

type ChoiceProps = {
  readonly value: RatingPreference;
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
};

/**
 * 평가 선택지 하나(명세 APP · 평가 선택지). 고르면 잘 맞았어요는 초록, 안 맞았어요는 빨강 테두리와 면이 된다.
 * 누르는 순간 선택 모양이 바뀌므로 크기 피드백은 두지 않는다(STATE S07).
 */
function Choice({ value, label, selected, onPress }: ChoiceProps) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-pressed={selected}
      {...pressableProps}
      onClick={onPress}
      className={cn(
        "pressable fb-surface flex h-13 flex-1 items-center justify-center gap-1 rounded-lg border text-title leading-none font-semibold",
        !selected && "border-border-strong bg-background text-text-body",
        selected && value === "GOOD" && "border-success-text bg-success-soft text-success-text",
        selected && value === "BAD" && "border-danger-action bg-danger-soft text-danger-action",
      )}
    >
      {/* TODO(#729): 엄지 아이콘(Tabler thumb-up · thumb-down, 20). Icon 부품이 들어오면 라벨 앞에 넣는다. */}
      {label}
    </button>
  );
}

type RatingChoiceProps = {
  readonly value: RatingPreference | null;
  /** 고른 것을 다시 누르면 고르지 않은 상태로 돌린다. 맞았는지는 고르지 않아도 되는 평가다. */
  readonly onValueChange: (value: RatingPreference | null) => void;
  /** 질문을 보이게 둘지. 소개 페이지의 견본은 질문 없이 선택지만 둔다. 숨겨도 묶음의 이름으로는 남는다. */
  readonly showLabel?: boolean;
};

const QUESTION = "피부에 맞았나요?";

/** 피부에 맞았는지 고르는 두 선택지. 둘 중 하나만 고르거나 둘 다 비워 둔다. */
export function RatingChoice({ value, onValueChange, showLabel = true }: RatingChoiceProps) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2">
      {showLabel ? (
        <p id={labelId} className="flex items-baseline gap-1">
          <span className="text-body font-bold text-text-primary">{QUESTION}</span>
          <span className="text-body-sm text-text-secondary">선택</span>
        </p>
      ) : null}
      <div
        role="group"
        aria-labelledby={showLabel ? labelId : undefined}
        aria-label={showLabel ? undefined : QUESTION}
        className="flex gap-2"
      >
        {CHOICES.map((choice) => (
          <Choice
            key={choice.value}
            value={choice.value}
            label={choice.label}
            selected={value === choice.value}
            onPress={() => onValueChange(value === choice.value ? null : choice.value)}
          />
        ))}
      </div>
    </div>
  );
}
