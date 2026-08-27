"use client";

import type { IngredientSuggestionResponse } from "@poudy/api/api.zod";

import { ConditionButton } from "@/components/ui/ConditionButton";
import { MatchedText } from "@/components/ui/MatchedText";
import { splitByRange } from "@/lib/domain/highlight";
import { effectColor } from "@/lib/domain/skin-effect-colors";

/** 한 줄에 담기는 만큼만 보인다. 나머지는 개수로 알린다. */
const VISIBLE_EFFECTS = 3;

type IngredientSuggestionsProps = {
  readonly items: readonly IngredientSuggestionResponse[];
  readonly loading: boolean;
  readonly includedIds: readonly number[];
  readonly excludedIds: readonly number[];
  readonly onToggle: (key: "includeIngredientIds" | "excludeIngredientIds", item: IngredientSuggestionResponse) => void;
};

export function IngredientSuggestions({
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
      {loading ? (
        <p className="flex min-h-40 items-center justify-center text-[13px] text-text-secondary">검색하는 중…</p>
      ) : items.length === 0 ? (
        <p className="flex min-h-40 items-center justify-center text-[13px] text-text-secondary">찾는 성분이 없어요</p>
      ) : (
        <ul aria-label="성분 검색 결과">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex min-h-[58px] items-center gap-1.5 border-b border-[#EEF0F3] px-3.5 py-2 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                {/*
                  성분 이름은 40자를 넘는 것이 있다. 한 줄로 자르면 앞머리가 비슷한
                  이름끼리 구분되지 않아 두 줄까지 보이고 거기서 줄인다.
                */}
                <IngredientName item={item} />
                <EffectTags effects={item.skinEffects} />
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
 * 성분 이름. 서버가 짚어 준 자리만 진하게 두고 나머지는 한 톤 흐리게 둔다.
 *
 * 자리를 클라이언트가 다시 찾지 않는다. 초성 `ㅍㅌㄴ` 이나 음차로 걸린 줄은 검색어
 * 글자가 이름 안에 그대로 있지 않아, 다시 찾아 나서면 아무 자리도 진해지지 않는다.
 *
 * 앞에 서는 것은 언제나 대표 한글 이름이다. 한글로 쓰인 목록에서 `Glycerin` 이 먼저
 * 오면 같은 성분이 검색어에 따라 다른 이름으로 보인다. 영문 이름이나 이명으로 걸린
 * 줄은 그 원문을 뒤에 덧붙여, 왜 떴는지만 함께 알린다.
 */
function IngredientName({ item }: { readonly item: IngredientSuggestionResponse }) {
  const { koreanName, match } = item;

  /* 짚어 준 자리가 없으면 대표 이름을 평소대로 둔다. 자동완성이 통째로 무너지지 않게 한다. */
  if (!match) {
    return <span className="line-clamp-2 text-[14px] font-semibold text-text-primary">{koreanName}</span>;
  }

  /*
   * 한글 이름에서 걸린 줄은 그 이름 위에 바로 토막을 낸다. 다른 자리에서 걸린 줄은
   * 한글 이름에 진하게 할 자리가 없으니 흐리게 하지 않고 평소대로 둔다.
   */
  const parts = match.field === "KOREAN_NAME" ? splitByRange(match) : [{ text: koreanName, matched: false }];

  return (
    <span className="line-clamp-2">
      <MatchedText
        label={koreanName}
        parts={parts}
        plainClassName="text-[14px] font-semibold text-text-primary"
        dimmedClassName="text-[14px] font-semibold text-text-primary"
        matchedClassName="text-brand-strong"
      />

      {/*
        한글 이름 밖에서 걸린 줄은 맞은 원문을 뒤에 덧붙인다. 그 원문 안에서 맞은
        자리를 진하게 두어야 `글리세린` 이 왜 떴는지가 보인다.
      */}
      {match.field === "KOREAN_NAME" ? null : (
        <>
          <span className="text-[14px] text-text-secondary"> · </span>
          <MatchedText
            label={match.text}
            parts={splitByRange(match)}
            plainClassName="text-[14px] text-text-secondary"
            dimmedClassName="text-[14px] text-text-secondary"
            matchedClassName="text-brand-strong"
          />
        </>
      )}
    </span>
  );
}

/**
 * 성분이 하는 일. 이름 아래에 배지로 둔다.
 *
 * 예전에는 이름과 같은 결의 회색 글자라 이름의 뒷부분처럼 읽혔다. 제품 상세와 전성분
 * 목록이 이미 쓰는 색 배지를 그대로 가져와, 이름과 다른 것임을 생김새로 가른다.
 */
function EffectTags({ effects }: { readonly effects: IngredientSuggestionResponse["skinEffects"] }) {
  if (effects.length === 0) return null;

  const shown = effects.slice(0, VISIBLE_EFFECTS);
  const rest = effects.length - shown.length;

  return (
    <span className="flex items-center gap-1 overflow-hidden">
      {shown.map((effect) => {
        const color = effectColor(effect.code);

        return (
          <span
            key={effect.code}
            className={`flex h-[18px] shrink-0 items-center rounded-[9px] px-1.5 text-[10px] font-semibold ${color.bg} ${color.text}`}
          >
            {effect.name}
          </span>
        );
      })}

      {rest > 0 ? (
        <span className="shrink-0 text-[10px] font-semibold text-text-secondary">
          <span aria-hidden="true">+{rest}</span>
          <span className="sr-only">외 {rest}개</span>
        </span>
      ) : null}
    </span>
  );
}
