"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CheckboxRow } from "@/components/filter/CheckboxRow";
import { SearchField } from "@/components/ui/SearchField";
import { fetchIngredients } from "@/lib/api/products";
import { findConflicts, type ExcludeCodeIngredients } from "@/lib/domain/conflict";
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
};

/** S03 성분 필터링 탭. 성분을 포함·제외로 담고 빠른 필터를 고른다. */
export function IngredientSearchPanel({ filter, onChange, excludeCodes }: IngredientSearchPanelProps) {
  const [keyword, setKeyword] = useState("");
  const { items } = useSuggestions(keyword, fetcher);

  const codeIngredients: ExcludeCodeIngredients = new Map(
    excludeCodes.map((code) => [code.code, code.ingredients.map((item) => item.id)]),
  );
  const conflicts = findConflicts(filter, codeIngredients);

  const add = (key: "includeIngredientIds" | "excludeIngredientIds", id: number) => {
    if (filter[key].includes(id)) return;
    onChange({ [key]: [...filter[key], id] });
  };

  const remove = (key: "includeIngredientIds" | "excludeIngredientIds", id: number) => {
    onChange({ [key]: filter[key].filter((item) => item !== id) });
  };

  const toggleCode = (code: ExcludeCode) =>
    onChange({
      excludeCodes: filter.excludeCodes.includes(code)
        ? filter.excludeCodes.filter((item) => item !== code)
        : [...filter.excludeCodes, code],
    });

  return (
    <div className="flex flex-col gap-4 p-4">
      <SearchField value={keyword} onChange={setKeyword} placeholder="성분명을 검색하세요" label="성분 검색" />

      {conflicts.length > 0 ? (
        <p role="alert" className="rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-brand">
          제외한 성분군에 속한 성분을 포함 조건으로 골랐어요. 조건을 다시 확인해 주세요.
        </p>
      ) : null}

      {keyword.trim() ? (
        <section>
          <h2 className="pb-2 text-[13px] font-semibold text-text-secondary">성분 {items.length}건</h2>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-3">
                <span className="flex flex-1 flex-col">
                  <span className="text-[14px] text-text-primary">{item.koreanName}</span>
                  <span className="text-[12px] text-text-secondary">
                    {item.skinEffects.map((effect) => effect.name).join(" · ")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => add("includeIngredientIds", item.id)}
                  className="h-8 rounded-lg border border-border px-3 text-[12px] font-semibold text-text-primary"
                >
                  포함
                </button>
                <button
                  type="button"
                  onClick={() => add("excludeIngredientIds", item.id)}
                  className="h-8 rounded-lg border border-border px-3 text-[12px] font-semibold text-text-primary"
                >
                  제외
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SelectedIngredients filter={filter} onRemove={remove} />

      <section>
        <h2 className="pb-2 text-[14px] font-semibold text-text-primary">빠른 필터</h2>
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
    </div>
  );
}

function SelectedIngredients({
  filter,
  onRemove,
}: {
  readonly filter: Filter;
  readonly onRemove: (key: "includeIngredientIds" | "excludeIngredientIds", id: number) => void;
}) {
  const total = filter.includeIngredientIds.length + filter.excludeIngredientIds.length;
  if (total === 0) return null;

  return (
    <section>
      <h2 className="pb-2 text-[14px] font-semibold text-text-primary">선택한 성분 {total}</h2>
      <ul className="flex flex-wrap gap-1.5">
        {filter.includeIngredientIds.map((id) => (
          <li key={`in-${id}`}>
            <Chip label={`성분 ${id} 포함`} onRemove={() => onRemove("includeIngredientIds", id)} />
          </li>
        ))}
        {filter.excludeIngredientIds.map((id) => (
          <li key={`ex-${id}`}>
            <Chip label={`성분 ${id} 제외`} onRemove={() => onRemove("excludeIngredientIds", id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chip({ label, onRemove }: { readonly label: string; readonly onRemove: () => void }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-2xl border border-border px-3 text-[13px] text-text-primary">
      {label}
      <button type="button" onClick={onRemove} aria-label={`${label} 삭제`}>
        ✕
      </button>
    </span>
  );
}
