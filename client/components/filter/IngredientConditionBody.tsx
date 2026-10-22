"use client";

import type { ExcludeCode } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { Tag } from "@poudy/design-system/tag";
import { ToggleChip, ToggleGroup } from "@poudy/design-system/toggle-chip";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useId } from "react";

import type { KnownExcludeCodeResponse } from "@/lib/domain/exclude-codes";
import type { Filter } from "@/lib/domain/filter";
import { formatCount } from "@/lib/domain/format";
import {
  type GroupConditionKey,
  groupResultName,
  groupSizeLabel,
  type IngredientGroups,
} from "@/lib/domain/ingredient-groups";

/** 담는 쪽. 원하는 성분(include) 또는 피하고 싶은 성분(exclude) */
export type ConditionPurpose = "include" | "exclude";

const SECTION = {
  include: { title: "원하는 성분", idsKey: "includeIngredientIds", groupKey: "includeGroupCodes" },
  exclude: { title: "피하고 싶은 성분", idsKey: "excludeIngredientIds", groupKey: "excludeGroupCodes" },
} as const satisfies Record<
  ConditionPurpose,
  {
    readonly title: string;
    readonly idsKey: "includeIngredientIds" | "excludeIngredientIds";
    readonly groupKey: GroupConditionKey;
  }
>;

export type IngredientConditionBodyProps = {
  readonly filter: Filter;
  /** 성분 ID 로 찾은 이름. 아직 모르는 성분은 '성분 ID'로 둔다. */
  readonly names: ReadonlyMap<number, string>;
  /** 담긴 성분군. 이름을 적는 데 쓴다. */
  readonly groups: IngredientGroups;
  /** 자주 피하는 성분 칩으로 늘어놓을 성분군 */
  readonly quickFilters: readonly KnownExcludeCodeResponse[];
  /** '+ 추가'나 비었을 때의 '검색해서 추가'를 누를 때. 성분을 담는 화면을 연다. */
  readonly onAdd: (purpose: ConditionPurpose) => void;
  readonly onRemoveIngredient: (purpose: ConditionPurpose, id: number) => void;
  readonly onRemoveGroup: (purpose: ConditionPurpose, code: string) => void;
  readonly onToggleQuickFilter: (code: ExcludeCode, pressed: boolean) => void;
  /** ⓘ 를 누를 때. 자주 피하는 성분 설명을 연다. */
  readonly onOpenQuickFilterInfo: () => void;
  /** 설명을 새 시트(dialog)로 여는지. 같은 시트 안의 다음 단계로 넘어가면 넘기지 않는다. */
  readonly quickFilterInfoIsDialog?: boolean;
};

/**
 * 성분 조건 편집 본문(명세 APP · 성분 조건 편집 본문 LBL92). 원하는 성분 → 피하고 싶은 성분 → 자주 피하는 성분 순서다.
 * 조건 일치 제품의 성분 시트(S23d·S23i)와 탐색 조건의 성분 탭(S22·S31)이 함께 쓴다.
 *
 * 담긴 것을 보여 주고 빼거나 켜고 끄는 일만 한다. 무엇을 바꿀지와 그때 남길 기록은 쓰는 화면이 정한다.
 */
export function IngredientConditionBody(props: IngredientConditionBodyProps) {
  const { filter, quickFilters, onToggleQuickFilter, onOpenQuickFilterInfo, quickFilterInfoIsDialog } = props;
  const quickId = useId();

  return (
    <div className="flex flex-col pb-4">
      <ConditionSection {...props} purpose="include" />
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <ConditionSection {...props} purpose="exclude" />

        <section aria-labelledby={quickId} className="flex flex-col gap-2 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <div className="flex items-center">
              <h3 id={quickId} className="text-body-sm font-semibold text-text-body">
                자주 피하는 성분
              </h3>
              <IconButton
                size="sm"
                label="자주 피하는 성분 설명"
                aria-haspopup={quickFilterInfoIsDialog ? "dialog" : undefined}
                icon={<Icon name="info-circle" size={16} className="text-text-secondary" />}
                onClick={onOpenQuickFilterInfo}
              />
            </div>
            {filter.excludeCodes.length > 0 ? (
              <span className="text-body-sm text-text-secondary">{formatCount(filter.excludeCodes.length)} 선택</span>
            ) : null}
          </div>
          <ToggleGroup aria-labelledby={quickId}>
            {quickFilters.map((code) => (
              <ToggleChip
                key={code.code}
                pressed={filter.excludeCodes.includes(code.code)}
                onPressedChange={(pressed) => onToggleQuickFilter(code.code, pressed)}
              >
                {code.name}
              </ToggleChip>
            ))}
          </ToggleGroup>
        </section>
      </div>
    </div>
  );
}

/**
 * 원하는 성분 · 피하고 싶은 성분 섹션. 담은 성분과 성분군을 칩(Tag item)으로 쌓고 ✕ 로 뺀다.
 * 비어 있으면 개수와 [+ 추가] 대신 '검색해서 추가' 버튼만 둔다(명세 S23i).
 */
function ConditionSection({
  purpose,
  filter,
  names,
  groups,
  onAdd,
  onRemoveIngredient,
  onRemoveGroup,
}: IngredientConditionBodyProps & { readonly purpose: ConditionPurpose }) {
  const headingId = useId();
  const { title, idsKey, groupKey } = SECTION[purpose];
  const ids = filter[idsKey];
  const codes = filter[groupKey];
  const count = ids.length + codes.length;

  return (
    <section
      aria-labelledby={headingId}
      className={purpose === "include" ? "flex flex-col gap-2 pt-2 pb-6" : "flex flex-col gap-2"}
    >
      {/* 머리 줄은 명세대로 32 다. [+ 추가]는 보이는 높이가 32 이고 누르는 영역만 44 로 넓힌다. */}
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-section font-bold text-text-primary">
          {title}
          {count > 0 ? <span className="text-text-secondary"> {count}</span> : null}
        </h3>
        {count > 0 ? (
          <Button
            variant="outline"
            leadingIcon={<Icon name="plus" size={16} />}
            onClick={() => onAdd(purpose)}
            aria-label={`${title} 추가`}
          >
            추가
          </Button>
        ) : null}
      </div>

      {count > 0 ? (
        <div className="flex flex-wrap gap-2">
          {codes.map((code) => {
            // 성분군 칩은 이름 뒤에 성분 수 배지를 두어 성분 칩과 구분한다(명세 S31). 성분군을 아직 받지 못했으면 코드만 둔다.
            const group = groups.get(code);
            const name = group ? groupResultName(group) : code;
            const badge = group ? groupSizeLabel(group) : undefined;
            const fullName = badge ? `${name} ${badge}` : name;
            return (
              <Tag
                key={`group-${code}`}
                variant="item"
                badge={badge}
                removeLabel={`${fullName} 빼기`}
                onRemove={() => onRemoveGroup(purpose, code)}
              >
                {name}
              </Tag>
            );
          })}
          {ids.map((id) => (
            <Tag key={id} variant="item" onRemove={() => onRemoveIngredient(purpose, id)}>
              {names.get(id) ?? `성분 ${id}`}
            </Tag>
          ))}
        </div>
      ) : (
        <EmptyAddButton label={`${title} 검색해서 추가`} onClick={() => onAdd(purpose)} />
      )}
    </section>
  );
}

/**
 * 섹션이 비었을 때의 추가 영역(명세 '빈 상태 · 추가 영역'). 보조 버튼(gray-100)보다 옅은 회색 면(ui-surface)에
 * 본문 색 글자를 두어, 빈 자리를 채우는 안내처럼 보이게 한다. 높이 48, 모서리 lg.
 */
function EmptyAddButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      type="button"
      {...pressableProps}
      onClick={onClick}
      className="pressable fb-border flex min-h-12 items-center justify-center gap-2 rounded-lg bg-surface px-4 py-3 text-body font-semibold break-keep text-text-body"
    >
      <Icon name="plus" size={16} scalable />
      {label}
    </button>
  );
}
