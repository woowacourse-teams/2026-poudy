import type { ExcludeGroupSummaryResponse, FormulationRoleResponse, SkinEffectResponse } from "@poudy/api/api.zod";
import type { ReactNode } from "react";

import { EffectIcon, effectLabel } from "./EffectTag";

import { CautionIcon } from "@/components/product/CautionIcon";

/** 효과 아이콘은 최대 3개까지 둔다(명세 APP · 성분 검색 결과 행, S55j). */
const VISIBLE_EFFECTS = 3;

export type IngredientRowProps = {
  readonly name: string;
  /** 이름 옆 배지. 성분군 행의 '성분군'. */
  readonly badge?: string;
  /** 이 성분이 속한 주의 성분군. 이름 바로 뒤에 위험 색 아이콘으로 둔다. */
  readonly cautions?: readonly ExcludeGroupSummaryResponse[];
  readonly effects?: readonly SkinEffectResponse[];
  /** 아래 줄의 제형 기능. 없으면 아래 줄을 비운다. */
  readonly formulationRoles?: readonly FormulationRoleResponse[];
  /** 성분군으로 이미 담긴 성분처럼 고를 수 없는 행. 글자와 아이콘을 흐리게 둔다. */
  readonly muted?: boolean;
  /** 오른쪽 끝 원형 버튼. 누르는 영역은 44 이고 보이는 원은 36 이다. */
  readonly action: ReactNode;
};

/**
 * 성분 행(명세 APP · 성분 검색 결과 행, S55j 나만의 필터 성분 행). 이름 뒤에 주의 성분군 아이콘과 효과 아이콘을 두고,
 * 아래 줄에 제형 기능을 가운뎃점으로 잇는다. 성분 검색 결과와 나만의 필터가 같은 행을 쓰고 오른쪽 버튼만 다르게 넘긴다.
 *
 * 아이콘은 보이는 글자가 없으므로 이름을 화면 밖 글자로 함께 둔다.
 */
export function IngredientRow({
  name,
  badge,
  cautions = [],
  effects = [],
  formulationRoles = [],
  muted = false,
  action,
}: IngredientRowProps) {
  const visibleEffects = effects.slice(0, VISIBLE_EFFECTS);
  const iconLabels = [...cautions.map((caution) => caution.name), ...visibleEffects.map(effectLabel)];
  const roles = formulationRoles.map((role) => role.name).join(" · ");

  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={
              muted
                ? "truncate text-title font-semibold text-text-secondary"
                : "truncate text-title font-semibold text-text-primary"
            }
          >
            {name}
          </span>
          {badge ? (
            <span className="flex h-5 shrink-0 items-center rounded-md bg-layer px-2 text-caption font-semibold text-text-secondary">
              {badge}
            </span>
          ) : null}
          {iconLabels.length > 0 ? (
            <span className="flex shrink-0 items-center gap-0.5">
              {cautions.map((caution) => (
                <span key={caution.code} className={muted ? "flex text-text-muted" : "flex text-danger-action"}>
                  <CautionIcon code={caution.code} size={14} />
                </span>
              ))}
              {visibleEffects.map((effect) => (
                <EffectIcon
                  key={effect.code}
                  code={effect.code}
                  size={14}
                  className={muted ? "text-text-muted" : "text-text-secondary"}
                />
              ))}
              <span className="sr-only">{iconLabels.join(", ")}</span>
            </span>
          ) : null}
        </div>
        {roles ? (
          <span
            className={muted ? "truncate text-body-sm text-text-muted" : "truncate text-body-sm text-text-secondary"}
          >
            {roles}
          </span>
        ) : null}
      </div>
      {action}
    </div>
  );
}
