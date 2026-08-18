"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckboxRow } from "@/components/filter/CheckboxRow";
import { SearchField } from "@/components/ui/SearchField";
import { fetchIngredients } from "@/lib/api/products";
import { type ExcludeCodeIngredients, findConflicts } from "@/lib/domain/conflict";
import type { ExcludeCode, Filter } from "@/lib/domain/filter";
import { useSuggestions } from "@/lib/hooks/useSuggestions";

const fetcher = async (keyword: string): Promise<readonly IngredientResponse[]> => {
  const response = await fetchIngredients(keyword);
  return response.items;
};

type IngredientSearchPanelProps = {
  readonly filter: Filter;
  readonly onChange: (changed: Partial<Filter>) => void;
  readonly excludeCodes: readonly ExcludeCodeResponse[];
  /** 화면에 이름을 보여 주기 위해 검색으로 만난 성분을 기억한다. */
  readonly names: ReadonlyMap<number, string>;
  readonly onLearnNames: (ingredients: readonly IngredientResponse[]) => void;
};

/** S03 성분 필터링 탭. 문구는 design/v1.pen 을 따른다. */
export function IngredientSearchPanel({
  filter,
  onChange,
  excludeCodes,
  names,
  onLearnNames,
}: IngredientSearchPanelProps) {
  const [keyword, setKeyword] = useState("");
  const { items } = useSuggestions(keyword, fetcher);
  const typing = keyword.trim().length > 0;

  const codeIngredients: ExcludeCodeIngredients = new Map(
    excludeCodes.map((code) => [code.code, code.ingredients.map((item) => item.id)]),
  );
  const conflicts = findConflicts(filter, codeIngredients);

  const selectedCount = filter.includeIngredientIds.length + filter.excludeIngredientIds.length;

  const add = (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientResponse) => {
    onLearnNames([item]);
    if (filter[key].includes(item.id)) return;
    onChange({ [key]: [...filter[key], item.id] });
  };

  const remove = (key: "includeIngredientIds" | "excludeIngredientIds", id: number) => {
    onChange({ [key]: filter[key].filter((value) => value !== id) });
  };

  const toggleCode = (code: ExcludeCode) =>
    onChange({
      excludeCodes: filter.excludeCodes.includes(code)
        ? filter.excludeCodes.filter((item) => item !== code)
        : [...filter.excludeCodes, code],
    });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <SearchField value={keyword} onChange={setKeyword} placeholder="성분명을 입력해 주세요" label="성분 검색" />
        <p className="text-[12px] text-text-secondary">검색한 성분을 포함 또는 제외 조건으로 추가할 수 있어요.</p>
      </div>

      {conflicts.length > 0 ? (
        <p role="alert" className="rounded-lg bg-brand-soft px-3 py-2 text-[12px] text-brand">
          제외한 성분군에 속한 성분을 포함 조건으로 골랐어요. 조건을 다시 확인해 주세요.
        </p>
      ) : null}

      {typing ? (
        <section>
          <h2 className="flex items-center gap-1.5 pb-2">
            <span className="text-[14px] font-bold text-text-primary">‘{keyword.trim()}’이 포함된 성분</span>
            <span className="text-[12px] font-medium text-text-secondary">{items.length}개</span>
          </h2>

          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-3">
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-text-primary">{item.koreanName}</span>
                  <span className="text-[10px] text-text-secondary">
                    {item.skinEffects.map((effect) => effect.name).join(" · ")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => add("includeIngredientIds", item)}
                  aria-pressed={filter.includeIngredientIds.includes(item.id)}
                  className="h-8 rounded-lg border border-border px-3 text-[12px] font-bold text-text-primary"
                >
                  포함
                </button>
                <button
                  type="button"
                  onClick={() => add("excludeIngredientIds", item)}
                  aria-pressed={filter.excludeIngredientIds.includes(item.id)}
                  className="h-8 rounded-lg border border-border px-3 text-[12px] font-semibold text-text-primary"
                >
                  제외
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selectedCount > 0 ? (
        <section>
          <h2 className="flex items-center gap-1.5 pb-2">
            <span className="text-[15px] font-bold text-text-primary">선택한 성분</span>
            <span className="text-[12px] font-medium text-text-secondary">{selectedCount}개</span>
          </h2>

          <ul className="flex flex-wrap gap-1.5">
            {filter.includeIngredientIds.map((id) => (
              <li key={`in-${id}`}>
                <SelectedChip
                  kind="포함"
                  name={names.get(id) ?? `성분 ${id}`}
                  onRemove={() => remove("includeIngredientIds", id)}
                />
              </li>
            ))}
            {filter.excludeIngredientIds.map((id) => (
              <li key={`ex-${id}`}>
                <SelectedChip
                  kind="제외"
                  name={names.get(id) ?? `성분 ${id}`}
                  onRemove={() => remove("excludeIngredientIds", id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="flex items-center gap-1.5 pb-2">
          <span className="text-[15px] font-bold text-text-primary">빠른 필터</span>
          {filter.excludeCodes.length > 0 ? (
            <span className="text-[12px] font-medium text-text-secondary">{filter.excludeCodes.length}개 선택</span>
          ) : null}
        </h2>

        <ul>
          {excludeCodes.map((code) => (
            <li key={code.code}>
              <CheckboxRow
                label={code.name}
                detail={code.description}
                checked={filter.excludeCodes.includes(code.code)}
                onToggle={() => toggleCode(code.code)}
              />
            </li>
          ))}
        </ul>
      </section>

      {selectedCount > 0 || filter.excludeCodes.length > 0 ? (
        <p className="text-[11px] text-text-secondary">
          성분 {selectedCount}개 · 빠른 필터 {filter.excludeCodes.length}개 적용
        </p>
      ) : null}
    </div>
  );
}

/** 디자인의 포함·제외 칩. 어떤 조건으로 담았는지 라벨로 구분한다. */
function SelectedChip({
  kind,
  name,
  onRemove,
}: {
  readonly kind: "포함" | "제외";
  readonly name: string;
  readonly onRemove: () => void;
}) {
  const include = kind === "포함";

  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-2xl border px-2.5 ${
        include ? "border-brand/30 bg-brand-soft" : "border-border bg-surface"
      }`}
    >
      <span className={`text-[10px] font-bold ${include ? "text-brand" : "text-text-secondary"}`}>{kind}</span>
      <span className="text-[12px] font-semibold text-text-primary">{name}</span>
      <button type="button" onClick={onRemove} aria-label={`${name} ${kind} 조건 삭제`}>
        <span aria-hidden="true" className="text-text-secondary">
          ✕
        </span>
      </button>
    </span>
  );
}
