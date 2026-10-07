"use client";

import type { ProductPartResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useState } from "react";

import { EffectTag } from "@/components/ingredient/EffectTag";
import { Icon } from "@/components/ui/icons/Icon";

/** 접기 전까지 보여 줄 성분 개수. design/v2.pen 의 `전성분 앞 5개 목록` 을 따른다. */
const COLLAPSED_COUNT = 5;

type IngredientListProps = {
  readonly ingredients: ProductPartResponse["ingredients"];
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
    <div className="flex flex-col gap-3">
      <ol className="w-full">
        {ingredients.map((ingredient, index) => {
          // 행에는 대표 작용 하나만 둔다. 나머지는 성분 설명에서 본다.
          const effect = ingredient.skinEffects[0];

          return (
            <li
              key={ingredient.id}
              hidden={collapsed && index >= COLLAPSED_COUNT}
              className="border-b border-[#DEE2E9] last:border-b-0"
            >
              <Link
                href={`/ingredients/${ingredient.id}`}
                prefetch="auto"
                className="flex min-h-[60px] items-center gap-2 px-0.5 py-2"
              >
                <span className="flex h-7 w-6 shrink-0 items-center justify-center text-[12px] text-[#566273]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/*
                  이름이 길면 칸이 줄어들게 `min-w-0` 을 준다. `flex-1` 만 있으면 `min-width` 가
                  `auto` 로 남아 칸이 글자 너비만큼 늘어나고, 그만큼 오른쪽 태그와 화살표가 밀려난다.
                  칸이 줄어들어야 `body` 에 선언된 `overflow-wrap: break-word` 가 비로소 동작한다.
                */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-[#182132]">{ingredient.koreanName}</span>
                  <span className="text-[12px] text-[#566273]">
                    {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
                  </span>
                </span>

                {/* 작용이 없는 성분(정제수 등)은 태그를 두지 않는다. 태그는 정보라서 빈칸을 채울 이유가 없다. */}
                {effect ? <EffectTag effect={effect} /> : null}

                <Icon name="chevron-right" size={16} className="shrink-0 text-[#566273]" />
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
          className="flex h-11 w-full items-center justify-center gap-1 rounded-[10px] bg-[#DEE2E9] px-4 text-[13px] font-semibold text-[#182132]"
        >
          {expanded ? "성분 목록 접기" : `나머지 ${restCount}개 성분 펼쳐보기`}
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} className="text-[#566273]" />
        </button>
      )}
    </div>
  );
}
