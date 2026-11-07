"use client";

import type { CautionIngredientResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { useLayoutEffect, useRef } from "react";

import { prefersReducedMotion } from "./preview-motion";

const ENTER_START_MS = 650;
const ENTER_STAGGER_MS = 180;
const ENTER_MS = 350;
const EXPAND_MS = 250;

/** 최종 높이는 처음부터 확보하고, 초록 면을 먼저 펼친 뒤 그 안에서 성분이 하나씩 나타난다. */
export function SuitedIngredients({ ingredients }: { readonly ingredients: readonly CautionIngredientResponse[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const box = boxRef.current;
    if (!box) return;
    // 높이를 바꾸지 않고 위에서 아래로 드러내야 흰 카드와 시트의 위치가 흔들리지 않는다.
    const radius = getComputedStyle(box).borderRadius;
    const expansion = box.animate(
      [{ clipPath: `inset(0 0 100% 0 round ${radius})` }, { clipPath: `inset(0 0 0 0 round ${radius})` }],
      { duration: EXPAND_MS, easing: "ease-out" },
    );
    const chips = [...(listRef.current?.querySelectorAll("li") ?? [])];
    const animations = chips.map((chip, order) =>
      chip.animate(
        [
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1 },
        ],
        {
          duration: ENTER_MS,
          delay: ENTER_START_MS + order * ENTER_STAGGER_MS,
          easing: "cubic-bezier(0.3, 0.7, 0.2, 1)",
          fill: "backwards",
        },
      ),
    );
    return () => [expansion, ...animations].forEach((animation) => animation?.cancel());
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption leading-normal text-text-body">
        {`이 제품에 든 성분 ${ingredients.length}개는 괜찮았어요. 앞으로 이 성분은 주의 후보에서 빼 드려요.`}
      </p>
      <div ref={boxRef} className="flex flex-col gap-2 rounded-xl bg-success-soft/50 p-3">
        <p className="flex items-center gap-1 text-caption leading-snug font-semibold text-success-text">
          <Icon name="check" size={14} />
          나에게 괜찮았던 성분
        </p>
        <ul ref={listRef} className="flex flex-wrap gap-1.5">
          {ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex h-7 max-w-full items-center rounded-full border border-success-border bg-success-soft px-2.5 text-caption leading-none font-medium whitespace-nowrap text-success-text"
            >
              {/* 줄 높이가 1이라 위아래 여백을 줘야 말줄임이 글자 아랫부분을 자르지 않는다. */}
              <span className="truncate py-1">{ingredient.koreanName}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
