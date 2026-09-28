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

/**
 * 서버 컴포넌트인 상세 화면에서 전성분 접기 상태만 클라이언트로 떼어낸다.
 *
 * 접힌 성분도 목록에 그려 두고 보이기만 감춘다. 눌러야 만들어지는 목록은
 * 검색 로봇이 받는 첫 HTML 에 남지 않아 전성분이 본문에서 통째로 빠진다.
 */
export function IngredientList({ ingredients }: IngredientListProps) {
  const [expanded, setExpanded] = useState(false);

  const collapsible = ingredients.length > COLLAPSED_COUNT;
  const collapsed = collapsible && !expanded;
  const restCount = ingredients.length - COLLAPSED_COUNT;

  return (
    <div className="flex flex-col items-center gap-3">
      <ol className="w-full">
        {ingredients.map((ingredient, index) => {
          const effect = ingredient.skinEffects[0];
          const color = effectColor(effect?.code);

          return (
            <li key={ingredient.id} hidden={collapsed && index >= COLLAPSED_COUNT}>
              <Link
                href={`/ingredients/${ingredient.id}`}
                prefetch="auto"
                className="flex min-h-[60px] items-center gap-2.5 border-b border-border py-2"
              >
                <span className="w-6 shrink-0 font-data text-[10px] text-[#8B8D94]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/*
                  이름이 길면 칸이 줄어들게 `min-w-0` 을 준다. `flex-1` 만 있으면 `min-width` 가
                  `auto` 로 남아 칸이 글자 너비만큼 늘어나고, 그만큼 오른쪽 태그와 화살표가 밀려난다.
                  칸이 줄어들어야 `body` 에 선언된 `overflow-wrap: break-word` 가 비로소 동작한다.
                */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-text-primary">{ingredient.koreanName}</span>
                  <span className="text-[10px] text-text-secondary">
                    {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
                  </span>
                </span>

                <span
                  className={`flex h-[22px] shrink-0 items-center rounded-[11px] px-2 text-[12px] font-semibold ${color.bg} ${color.text}`}
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
          className="relative isolate flex h-12 w-full items-center justify-center gap-1.5 bg-transparent px-3.5 text-[13px] font-semibold text-[#202124] before:absolute before:inset-y-0 before:-inset-x-4 before:-z-10 before:rounded-[10px] before:bg-[#F4F5F6] before:content-['']"
        >
          {expanded ? "성분 목록 접기" : `나머지 ${restCount}개 성분 펼쳐보기`}
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} className="text-text-secondary" />
        </button>
      )}
    </div>
  );
}
