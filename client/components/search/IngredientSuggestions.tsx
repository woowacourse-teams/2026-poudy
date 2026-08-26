"use client";

import type { IngredientResponse } from "@poudy/api/api.zod";

import { ConditionButton } from "@/components/ui/ConditionButton";
import { hasMatch, splitByKeyword } from "@/lib/domain/highlight";
import { ingredientCountLabel } from "@/lib/domain/ingredient-search";

type IngredientSuggestionsProps = {
  /** 맞는 자리를 굵게 보이기 위해 받는다. */
  readonly keyword: string;
  readonly items: readonly IngredientResponse[];
  readonly loading: boolean;
  readonly includedIds: readonly number[];
  readonly excludedIds: readonly number[];
  readonly onToggle: (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientResponse) => void;
};

export function IngredientSuggestions({
  keyword,
  items,
  loading,
  includedIds,
  excludedIds,
  onToggle,
}: IngredientSuggestionsProps) {
  return (
    /* 제목 줄을 두지 않는다. 무엇을 찾는 중인지는 바로 위 입력창에 그대로 떠 있고,
       고를 것은 아래 목록에 이미 보인다. 같은 말을 한 번 더 얹지 않는다. */
    <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#E8E9EC] bg-white shadow-lg">
      <h3 className="flex items-center gap-1.5 border-b border-[#F2F3F6] px-3.5 py-2.5">
        <span className="truncate text-[12px] font-bold text-[#212124]">‘{keyword}’이 포함된 성분</span>
        {loading ? null : (
          <span className="shrink-0 text-[12px] font-medium text-[#868B94]">{ingredientCountLabel(items.length)}</span>
        )}
      </h3>

      {loading ? (
        <p className="flex min-h-40 items-center justify-center text-[13px] text-text-secondary">검색하는 중…</p>
      ) : items.length === 0 ? (
        <p className="flex min-h-40 items-center justify-center text-[13px] text-text-secondary">찾는 성분이 없어요</p>
      ) : (
        <ul aria-label="성분 검색 결과">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex h-[58px] items-center gap-1.5 border-b border-[#EEF0F3] px-3.5 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <IngredientName name={item.koreanName} keyword={keyword} />
                <span className="truncate text-[10px] text-text-secondary">
                  {item.skinEffects.map((effect) => effect.name).join(" · ")}
                </span>
              </span>

              <span className="flex shrink-0 gap-1.5">
                <ConditionButton
                  kind="include"
                  active={includedIds.includes(item.id)}
                  ingredientName={item.koreanName}
                  onClick={() => onToggle("includeIngredientIds", item)}
                />
                <ConditionButton
                  kind="exclude"
                  active={excludedIds.includes(item.id)}
                  ingredientName={item.koreanName}
                  onClick={() => onToggle("excludeIngredientIds", item)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 성분 이름. 검색어와 맞는 자리만 진하게 두고 나머지는 한 톤 흐리게 둔다.
 *
 * 맞는 자리가 없으면 흐리게 하지 않는다. 서버가 영문 이름까지 훑어 뜬 결과가 그런데,
 * 이름 전체를 흐리게 두면 왜 떴는지도 모른 채 읽기만 나빠진다.
 */
function IngredientName({ name, keyword }: { readonly name: string; readonly keyword: string }) {
  const parts = splitByKeyword(name, keyword);

  if (!hasMatch(parts)) {
    return <span className="truncate text-[12px] font-semibold text-text-primary">{name}</span>;
  }

  return (
    <span className="truncate text-[12px] text-text-secondary">
      {/* 낭독기와 검사 도구에는 온전한 이름 하나로 남긴다. 토막은 눈으로 보는 결에만 쓴다. */}
      <span className="sr-only">{name}</span>
      {parts.map((part, at) => (
        // 토막은 자리로만 구분된다. 같은 글자가 되풀이될 수 있어 글자를 키로 쓰지 못한다.
        <span key={at} aria-hidden="true" className={part.matched ? "font-bold text-text-primary" : undefined}>
          {part.text}
        </span>
      ))}
    </span>
  );
}
