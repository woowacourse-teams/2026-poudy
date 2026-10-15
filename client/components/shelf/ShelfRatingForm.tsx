"use client";

import type { ShelfUsageStatus } from "@poudy/api/api.zod";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { Slider } from "@poudy/design-system/slider";
import { useId } from "react";

import { RatingChoice } from "./RatingChoice";

import { Icon } from "@/components/ui/icons/Icon";
import type { RatingDraft } from "@/lib/domain/shelf";

const usageOf = (value: string): ShelfUsageStatus => (value === "USED" ? "USED" : "IN_USE");

type LevelFieldProps = {
  readonly question: string;
  readonly label: string;
  readonly tone: "moisture" | "oil";
  readonly value: number | null;
  readonly onValueChange: (value: number) => void;
  readonly startLabel: string;
  readonly endLabel: string;
};

function LevelField({ question, label, tone, value, onValueChange, startLabel, endLabel }: LevelFieldProps) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <p id={labelId} className="flex items-baseline gap-1">
        <span className="text-body font-bold text-text-primary">{question}</span>
        <span className="text-body-sm text-text-secondary">선택</span>
      </p>
      {/*
        명세는 값을 고르기 전에 '선택 전'을 적고 손잡이를 감춘다. Slider 에는 고르지 않은 상태가 없어
        고르기 전에는 0 자리에 둔다. 값은 사용자가 움직인 뒤에만 보낸다(명세 수정 필요 · 보고에 적음).
      */}
      <Slider
        label={label}
        tone={tone}
        value={value ?? 0}
        onValueChange={onValueChange}
        startLabel={startLabel}
        endLabel={endLabel}
      />
    </div>
  );
}

type ShelfRatingFormProps = {
  readonly draft: RatingDraft;
  readonly onDraftChange: (draft: RatingDraft) => void;
  /** 사용 상태 질문. 제품을 막 담았으면 '지금 쓰고 있나요?', 고칠 때는 '지금도 쓰고 있나요?'다. */
  readonly usageQuestion: string;
};

/**
 * 평가 시트의 본문(명세 S52e·S52i·S53f). 사용 상태, 맞았는지, 수분감, 유분감을 고른다.
 * 사용 상태 말고는 모두 고르지 않아도 된다.
 */
export function ShelfRatingForm({ draft, onDraftChange, usageQuestion }: ShelfRatingFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <RadioGroup
        label={usageQuestion}
        variant="choice"
        size="sm"
        columns={2}
        value={draft.usageStatus}
        onValueChange={(value) => onDraftChange({ ...draft, usageStatus: usageOf(value) })}
      >
        <RadioGroupItem value="IN_USE">네</RadioGroupItem>
        <RadioGroupItem value="USED">아니요</RadioGroupItem>
      </RadioGroup>

      <RatingChoice value={draft.preference} onValueChange={(preference) => onDraftChange({ ...draft, preference })} />

      <LevelField
        question="촉촉함(수분감)은 어땠나요?"
        label="수분감"
        tone="moisture"
        value={draft.moistureLevel}
        onValueChange={(moistureLevel) => onDraftChange({ ...draft, moistureLevel })}
        startLabel="건조해요"
        endLabel="촉촉해요"
      />

      <LevelField
        question="번들거림(유분감)은 어땠나요?"
        label="유분감"
        tone="oil"
        value={draft.oilLevel}
        onValueChange={(oilLevel) => onDraftChange({ ...draft, oilLevel })}
        startLabel="산뜻해요"
        endLabel="번들거려요"
      />

      <p className="flex items-center gap-1 text-caption text-text-secondary">
        <Icon name="info" size={14} />
        수분감·유분감 평가는 유수분 레벨을 다듬는 데 쓰여요
      </p>
    </div>
  );
}
