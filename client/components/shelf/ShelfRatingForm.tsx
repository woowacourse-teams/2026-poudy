"use client";

import type { ShelfUsageStatus } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { Slider } from "@poudy/design-system/slider";
import { useId } from "react";

import { RatingChoice } from "./RatingChoice";

import { type RatingDraft, ratingLevelMark, ratingLevelText } from "@/lib/domain/shelf";

const usageOf = (value: string): ShelfUsageStatus => (value === "USED" ? "USED" : "IN_USE");

type LevelFieldProps = {
  readonly question: string;
  readonly label: string;
  readonly tone: "moisture" | "oil";
  readonly value: number | null;
  readonly onValueChange: (value: number) => void;
};

/** 사용감 질문 하나. 질문 줄 아래에 0~3 슬라이더를 두고, 값과 눈금은 단계 이름으로 적는다(S52e-1). */
function LevelField({ question, label, tone, value, onValueChange }: LevelFieldProps) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <p id={labelId} className="flex items-center gap-1">
        <span className="text-body leading-snug font-bold text-text-primary">{question}</span>
        <span className="text-caption leading-snug text-text-secondary">선택</span>
      </p>
      {/* 고르기 전(null)에는 손잡이와 값을 그리지 않는다. 값은 사용자가 고른 뒤에만 보낸다. */}
      <Slider
        label={label}
        tone={tone}
        value={value}
        onValueChange={onValueChange}
        formatValue={ratingLevelText}
        formatMark={ratingLevelMark}
      />
    </div>
  );
}

type StepProps = {
  readonly draft: RatingDraft;
  readonly onDraftChange: (draft: RatingDraft) => void;
};

/**
 * 평가 1단계(S52e · S52i). 제품을 막 담았으면 '지금 쓰고 있나요?'를 먼저 묻고, 피부에 맞았는지를 고른다.
 * 평가 고치기는 사용 상태를 묻지 않는다. 사용 상태는 제품 메뉴의 옮기기에서만 바꾼다.
 */
export function RatingFitStep({ draft, onDraftChange, askUsage }: StepProps & { readonly askUsage: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {askUsage ? (
        <RadioGroup
          label="지금 쓰고 있나요?"
          variant="choice"
          size="sm"
          columns={2}
          // 이 질문에는 안내도 오류도 없어, 빈 문구 자리 없이 다음 질문과 20 만 띄운다(S52i).
          reserveMessage={false}
          value={draft.usageStatus}
          onValueChange={(value) => onDraftChange({ ...draft, usageStatus: usageOf(value) })}
        >
          <RadioGroupItem value="IN_USE">네</RadioGroupItem>
          <RadioGroupItem value="USED">아니요</RadioGroupItem>
        </RadioGroup>
      ) : null}

      <RatingChoice value={draft.preference} onValueChange={(preference) => onDraftChange({ ...draft, preference })} />
    </div>
  );
}

/**
 * 평가 2단계 · 사용감(S52e-1 · S52i-2). 수분감과 유분감 슬라이더, 그 쓰임을 알리는 주석이다.
 * 고치기 시트는 '촉촉함(수분감)은 어땠나요?'처럼 묻고, 담은 직후 시트는 '촉촉함(수분감)'으로 줄여 쓴다.
 */
export function RatingFeelStep({ draft, onDraftChange, short }: StepProps & { readonly short: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <LevelField
        question={short ? "촉촉함(수분감)" : "촉촉함(수분감)은 어땠나요?"}
        label="수분감"
        tone="moisture"
        value={draft.moistureLevel}
        onValueChange={(moistureLevel) => onDraftChange({ ...draft, moistureLevel })}
      />
      <LevelField
        question={short ? "번들거림(유분감)" : "번들거림(유분감)은 어땠나요?"}
        label="유분감"
        tone="oil"
        value={draft.oilLevel}
        onValueChange={(oilLevel) => onDraftChange({ ...draft, oilLevel })}
      />
      <p className="flex items-center gap-1 text-caption leading-snug text-text-secondary">
        <Icon name="info-circle" size={14} scalable />
        수분감·유분감 평가는 유수분 레벨을 다듬는 데 쓰여요
      </p>
    </div>
  );
}
