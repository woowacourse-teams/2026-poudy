"use client";

import type { SkinType, SkinTypeResponse } from "@poudy/api/api.zod";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";

import { type Filter, SENSITIVE, SENSITIVE_OPTION } from "@/lib/domain/filter";

type SkinTypeOptionsProps = {
  readonly skinType: SkinType | undefined;
  readonly sensitiveSkin: boolean;
  readonly onChange: (changed: Pick<Filter, "skinType" | "sensitiveSkin">) => void;
  /** 서버가 피부 타입 조건만 제외해 계산한 후보. */
  readonly skinTypes: readonly SkinTypeResponse[];
};

/**
 * 피부 타입 시트(명세 S23j, 체크 목록 행). 민감성은 다른 타입과 함께 걸 수 있다.
 * 서버가 건성·지성·복합성은 한 번에 하나만 받으므로, 그 셋 가운데 새로 고르면 앞의 것이 풀린다.
 */
export function SkinTypeOptions({ skinType, sensitiveSkin, onChange, skinTypes }: SkinTypeOptionsProps) {
  const value = [...(skinType ? [skinType] : []), ...(sensitiveSkin ? [SENSITIVE] : [])];

  const change = (next: readonly string[]) => {
    const added = next.find((item) => !value.includes(item));
    const nextSkinType =
      added && added !== SENSITIVE
        ? skinTypes.find((type) => type.code === added)?.code
        : skinTypes.find((type) => next.includes(type.code))?.code;
    onChange({ skinType: nextSkinType, sensitiveSkin: next.includes(SENSITIVE) });
  };

  return (
    <CheckboxGroup aria-label="피부 타입" value={value} onValueChange={change}>
      {[...skinTypes, SENSITIVE_OPTION].map(({ code, name }) => (
        <CheckboxGroupItem key={code} value={code}>
          {name}
        </CheckboxGroupItem>
      ))}
    </CheckboxGroup>
  );
}
