"use client";

import { SkinType, type SkinTypeResponse } from "@poudy/api/api.zod";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";

import { type Filter, SENSITIVE, SENSITIVE_OPTION } from "@/lib/domain/filter";

type SkinTypeOptionsProps = {
  /** 고른 피부 타입(건성·지성·복합성). */
  readonly selected: readonly SkinType[];
  readonly sensitiveSkin: boolean;
  readonly onChange: (changed: Pick<Filter, "skinTypes" | "sensitiveSkin">) => void;
  /** 서버가 피부 타입과 민감성 조건을 모두 제외해 계산한 후보. */
  readonly skinTypes: readonly SkinTypeResponse[];
  readonly sensitiveSkinAvailable: boolean;
};

/**
 * 피부 타입 시트(명세 S23j, 체크 목록 행). 건성·지성·복합성·민감성을 모두 여러 개 고를 수 있다.
 * 민감성은 서버 쿼리에서 sensitiveSkin 으로 따로 보내므로 고른 값을 둘로 나눠 넘긴다.
 */
export function SkinTypeOptions({
  selected,
  sensitiveSkin,
  onChange,
  skinTypes,
  sensitiveSkinAvailable,
}: SkinTypeOptionsProps) {
  const value = [...selected, ...(sensitiveSkin ? [SENSITIVE] : [])];
  const options = [...skinTypes, ...(sensitiveSkinAvailable ? [SENSITIVE_OPTION] : [])];

  const change = (next: readonly string[]) =>
    onChange({
      skinTypes: SkinType.options.filter((code) => next.includes(code)),
      sensitiveSkin: next.includes(SENSITIVE),
    });

  if (options.length === 0) {
    return (
      <p role="status" className="py-8 text-center text-body-sm text-text-secondary">
        지금 조건에서 고를 수 있는 피부 타입이 없어요.
      </p>
    );
  }

  return (
    <CheckboxGroup aria-label="피부 타입" value={value} onValueChange={change}>
      {options.map(({ code, name }) => (
        <CheckboxGroupItem key={code} value={code}>
          {name}
        </CheckboxGroupItem>
      ))}
    </CheckboxGroup>
  );
}
