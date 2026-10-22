"use client";

import type { IngredientGroupResponse } from "@poudy/api/api.zod";
import { Tag } from "@poudy/design-system/tag";
import { useCallback, useState } from "react";

import type { Filter } from "@/lib/domain/filter";
import { groupLabel, type IngredientGroups } from "@/lib/domain/ingredient-groups";

type AppliedConditionsProps = {
  readonly filter: Filter;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** 성분 ID 와 이름. 조건에는 ID 만 남으므로 화면이 받아 둔 이름을 넘긴다. */
  readonly names: ReadonlyMap<number, string>;
  readonly groups: IngredientGroups;
};

/** 칩 하나가 온전히 보이는지 가르는 비율. 줄 경계에 반쯤 걸린 칩은 숨긴 것으로 센다. */
const FULLY_VISIBLE = 0.99;

const ingredientName = (names: ReadonlyMap<number, string>, id: number) => names.get(id) ?? `성분 ${id}`;

const groupName = (groups: IngredientGroups, code: string) => {
  const group = groups.get(code);
  return group ? groupLabel(group) : code;
};

/**
 * 적용된 조건 줄(명세 APP · 적용된 조건 줄 IUpGY). 걸린 성분 조건을 읽기 전용으로 요약한다. 고치는 일은 위의 필터 칩이 맡는다.
 *
 * 포함 줄과 제외 줄을 세로로 쌓는다. 카테고리·브랜드·유수분·피부 타입은 필터 칩 이름에 값으로 적으므로 여기 넣지 않는다.
 * 비어 있는 줄은 숨기고, 두 줄이 모두 비면 전체를 숨긴다.
 */
export function AppliedConditions({ filter, excludeCodes, names, groups }: AppliedConditionsProps) {
  const included = [
    ...filter.includeIngredientIds.map((id) => ingredientName(names, id)),
    ...filter.includeGroupCodes.map((code) => groupName(groups, code)),
  ];
  const excluded = [
    ...filter.excludeIngredientIds.map((id) => ingredientName(names, id)),
    ...filter.excludeCodes.map((code) => excludeCodes.find((item) => item.code === code)?.name ?? code),
    ...filter.excludeGroupCodes.map((code) => groupName(groups, code)),
  ];

  if (included.length === 0 && excluded.length === 0) return null;

  return (
    <div role="group" aria-label="적용된 조건" className="flex flex-col gap-1.5 px-gutter">
      {included.length > 0 ? <ConditionLine label="포함" items={included} /> : null}
      {excluded.length > 0 ? <ConditionLine label="제외" items={excluded} /> : null}
    </div>
  );
}

/**
 * 한 줄로 고정한 조건 줄. 칩을 순서대로 흘리고, 줄을 넘친 칩은 다음 줄로 밀려 잘린다. 잘린 칩 수를 줄 끝에 '외 N개'로 적는다.
 *
 * 넘친 칩은 레이아웃을 재지 않고 IntersectionObserver 로 센다. 줄을 root 로 두고 칩마다 온전히 보이는지만 받는다.
 * 숨긴 칩도 DOM 에 남아 보조 기술은 모두 읽는다. '외 N개'는 화면에만 보인다.
 */
function ConditionLine({ label, items }: { readonly label: string; readonly items: readonly string[] }) {
  const [hiddenCount, setHiddenCount] = useState(0);
  const itemsKey = items.join("\u0000");

  // 칩 목록이 바뀌면 관찰을 새로 건다. ref 콜백이 돌려준 정리 함수가 앞의 관찰을 끊는다(React 19).
  const observe = useCallback(
    (row: HTMLDivElement | null) => {
      if (!row || typeof IntersectionObserver === "undefined") return;
      const visible = new Map<Element, boolean>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) visible.set(entry.target, entry.intersectionRatio >= FULLY_VISIBLE);
          setHiddenCount([...visible.values()].filter((shown) => !shown).length);
        },
        { root: row, threshold: [0, FULLY_VISIBLE] },
      );
      for (const chip of row.children) observer.observe(chip);
      return () => observer.disconnect();
    },
    // 같은 칩 목록이면 관찰을 다시 걸지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemsKey],
  );

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-7 shrink-0 text-caption font-semibold whitespace-nowrap text-text-secondary">{label}</span>
      <div ref={observe} className="flex h-7 min-w-0 flex-1 flex-wrap gap-2 overflow-hidden">
        {items.map((item, index) => (
          <Tag key={`${item}-${index}`} variant="summary">
            {item}
          </Tag>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <span aria-hidden="true" className="shrink-0 text-body-sm font-semibold text-text-secondary">
          외 {hiddenCount}개
        </span>
      ) : null}
    </div>
  );
}
