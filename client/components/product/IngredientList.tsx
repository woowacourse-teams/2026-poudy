"use client";

import type { ProductDetailResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { effectColor } from "@/lib/domain/skin-effect-colors";

/** 접기 전까지 보여 줄 성분 개수. design/v1.pen 의 `전성분 앞 5개 목록` 을 따른다. */
const COLLAPSED_COUNT = 5;

type IngredientListProps = {
  readonly ingredients: ProductDetailResponse["ingredients"];
};

/** 서버 컴포넌트인 상세 화면에서 전성분 접기 상태만 클라이언트로 떼어낸다. */
export function IngredientList({ ingredients }: IngredientListProps) {
  const [expanded, setExpanded] = useState(false);

  const collapsible = ingredients.length > COLLAPSED_COUNT;
  const visible = collapsible && !expanded ? ingredients.slice(0, COLLAPSED_COUNT) : ingredients;
  const restCount = ingredients.length - COLLAPSED_COUNT;

  return (
    <div className="flex flex-col items-center gap-3">
      <ol className="w-full">
        {visible.map((ingredient, index) => {
          const effect = ingredient.skinEffects[0];
          const color = effectColor(effect?.code);

          return (
            <li key={ingredient.id}>
              <Link
                href={`/ingredients/${ingredient.id}?from=product_detail`}
                prefetch="auto"
                className="flex h-[60px] items-center gap-2.5 border-b border-border"
              >
                <span className="w-6 shrink-0 font-data text-[10px] text-[#8B8D94]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-text-primary">{ingredient.koreanName}</span>
                  <span className="text-[10px] text-text-secondary">
                    {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
                  </span>
                </span>

                <span
                  className={`flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[10px] font-semibold ${color.bg} ${color.text}`}
                >
                  {effect?.name ?? "일반"}
                </span>

                <Icon name="chevron-right" size={16} className="text-text-secondary" />
              </Link>
            </li>
          );
        })}
      </ol>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#F4F5F6] px-3.5 text-[13px] font-semibold text-[#202124]"
        >
          {expanded ? "성분 목록 접기" : `나머지 ${restCount}개 성분 펼쳐보기`}
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} className="text-text-secondary" />
        </button>
      )}
    </div>
  );
}
