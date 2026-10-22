"use client";

import type { RatingPreference } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useId } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import type { IconId } from "@/components/ui/icons/sprite";

const CHOICES = [
  { value: "GOOD", label: "잘 맞았어요", icon: "thumb-up" },
  { value: "BAD", label: "안 맞았어요", icon: "thumb-down" },
] as const satisfies readonly { readonly value: RatingPreference; readonly label: string; readonly icon: IconId }[];

type ChoiceProps = {
  readonly value: RatingPreference;
  readonly label: string;
  readonly icon: IconId;
  readonly selected: boolean;
  readonly onPress: () => void;
};

/**
 * 평가 선택지 하나(명세 APP · 평가 선택지). 고르면 잘 맞았어요는 초록, 안 맞았어요는 빨강 테두리와 면이 된다.
 * 누르는 순간 선택 모양이 바뀌므로 크기 피드백은 두지 않는다(STATE S07).
 */
function Choice({ value, label, icon, selected, onPress }: ChoiceProps) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      aria-pressed={selected}
      {...pressableProps}
      onClick={onPress}
      className={cn(
        "pressable fb-surface flex min-h-13 flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-title leading-tight font-semibold",
        !selected && "border-border-strong bg-background text-text-body",
        selected && value === "GOOD" && "border-success-text bg-success-soft text-success-text",
        selected && value === "BAD" && "border-danger-action bg-danger-soft text-danger-action",
      )}
    >
      {/* 고르기 전에는 라벨보다 옅게, 고르면 라벨과 같은 색이다. 글자를 크게 키우면 라벨이 줄을 바꾸고 칸이 따라 커진다. */}
      <span className={cn("shrink-0", !selected && "text-text-secondary")}>
        <Icon name={icon} size={20} strokeWidth={2} />
      </span>
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
      {/*
        두 칸에 '맞았어요'가 들지 않을 만큼 글자를 키우면(320 폭 기준 1.9배부터) 한 줄에 하나씩 놓는다.
        폭을 재는 칸(@container) 안에 격자를 둔다. 기준은 글자를 따라 커지도록 em 으로 잡는다.
      */}
      <div className="@container">
        <div
          role="group"
          aria-labelledby={showLabel ? labelId : undefined}
          aria-label={showLabel ? undefined : QUESTION}
          className="grid grid-cols-1 gap-2 @min-[9.6em]:grid-cols-2"
        >
          {CHOICES.map((choice) => (
            <Choice
              key={choice.value}
              value={choice.value}
              label={choice.label}
              icon={choice.icon}
              selected={value === choice.value}
              onPress={() => onValueChange(value === choice.value ? null : choice.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
