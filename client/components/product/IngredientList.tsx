"use client";

import type { ProductIngredientResponse, ProductPartResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useState } from "react";

import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";
import { collapsedView } from "@/lib/domain/ingredient-collapse";

/** 접기 전까지 보여 줄 성분 개수. 명세 S24 의 `전성분 앞 5개 목록` 을 따른다. */
const COLLAPSED_COUNT = 5;

type IngredientListProps = {
  readonly ingredients: ProductPartResponse["ingredients"];
};

/**
 * 서버 컴포넌트인 상세 화면에서 전성분 접기 상태만 클라이언트로 떼어낸다.
 *
 * 접힌 성분도 목록에 그려 두고 보이기만 감춘다. 눌러야 만들어지는 목록은
 * 검색 로봇이 받는 첫 HTML 에 남지 않아 전성분이 본문에서 통째로 빠진다.
 *
 * 접힌 동안에도 주의 성분은 보인다. 그 앞에 감춘 성분이 있으면 몇 번부터 몇 번까지인지 한 줄로 알린다.
 */
export function IngredientList({ ingredients }: IngredientListProps) {
  const [expanded, setExpanded] = useState(false);
  const { pressableProps } = usePressable();

  const view = collapsedView(
    ingredients.map((ingredient) => ingredient.cautions.length > 0),
    COLLAPSED_COUNT,
  );
  const collapsed = view.hiddenCount > 0 && !expanded;
  const shown = (index: number) => !collapsed || view.visible.has(index);
  // 나눔선은 보이는 마지막 행에만 두지 않는다. 뒤에 감춘 행이 있어도 보이는 쪽에서 끝을 정한다.
  const lastShown = ingredients.findLastIndex((_, index) => shown(index));

  return (
    <div className="flex flex-col gap-3">
      <ol className="w-full border-t border-border">
        {ingredients.flatMap((ingredient, index) => {
          const gap = collapsed ? view.gapsBefore.get(index) : undefined;
          const row = (
            <li
              key={ingredient.id}
              hidden={!shown(index)}
              className={index === lastShown ? undefined : "border-b border-border"}
            >
              <IngredientRow ingredient={ingredient} order={index + 1} />
            </li>
          );
          if (!gap) return [row];

          return [
            <li
              key={`gap-${gap.from}`}
              className="flex min-h-8 items-center gap-2 px-0.5 text-caption text-text-secondary"
            >
              <span className="flex w-6 shrink-0 justify-center">
                <Icon name="dots-vertical" size={14} scalable />
              </span>
              {String(gap.from).padStart(2, "0")}~{String(gap.to).padStart(2, "0")}번 성분 {gap.to - gap.from + 1}개
            </li>,
            row,
          ];
        })}
      </ol>

      {view.hiddenCount > 0 && (
        <button
          type="button"
          {...pressableProps}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="pressable fb-secondary press-scale flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-button-secondary px-4 py-2 text-center text-13 leading-snug font-semibold text-text-primary"
        >
          {expanded ? "성분 목록 접기" : `나머지 ${view.hiddenCount}개 성분 펼쳐보기`}
          {/* 펼치면 꺾쇠만 반 바퀴 돈다(MOTION '펼치기 · 접기', fast). 움직임 줄이기에서는 돌지 않고 바로 바뀐다. */}
          <Icon
            name="chevron-down"
            size={16}
            scalable
            className={cn(
              "text-text-secondary transition-transform duration-(--duration-fast) ease-(--ease-out) motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}
    </div>
  );
}

function IngredientRow({
  ingredient,
  order,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly order: number;
}) {
  // 스크롤하다 스친 행이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });
  const caution = ingredient.cautions[0];
  // 행에는 대표 작용 하나만 둔다. 나머지는 성분 설명에서 본다. 주의 성분이면 작용보다 주의를 먼저 알린다.
  const effect = ingredient.skinEffects[0];

  return (
    <Link
      href={`/ingredients/${ingredient.id}`}
      prefetch="auto"
      {...pressableProps}
      className="pressable fb-surface flex min-h-15 items-center gap-2 px-0.5"
    >
      {/* 순번 칸은 글자를 따라 넓어지게 최소 폭만 준다. 1배에서는 24px 그대로다. */}
      <span className="flex h-7 min-w-6 shrink-0 items-center justify-center text-label text-text-secondary tabular-nums">
        {String(order).padStart(2, "0")}
      </span>

      {/*
        이름 칸과 태그를 한 묶음으로 두고, 자리가 모자라면 태그가 이름 아래 줄 오른쪽으로 내려가게 한다.
        이름 칸은 글자 폭을 기본 폭으로 삼는다(grow). 기기에서 글자를 키워도 이름이 태그에 밀려
        낱말 가운데서 갈라지기 전에 태그가 먼저 다음 줄로 넘어간다. 1배에서는 한 줄 그대로다.
      */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span className="flex min-w-24 grow flex-col gap-0.5">
          <span className="text-13 leading-snug font-semibold text-text-primary">{ingredient.koreanName}</span>
          <span className="text-caption text-text-secondary">
            {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
          </span>
        </span>

        {/* 작용이 없는 성분(정제수 등)은 태그를 두지 않는다. 태그는 정보라서 빈칸을 채울 이유가 없다. */}
        {caution ? (
          <Tag variant="label" tone="caution">
            {caution.label}
          </Tag>
        ) : effect ? (
          <Tag variant="label" tone="neutral" icon={<EffectIcon code={effect.code} size={14} />}>
            {effectLabel(effect)}
          </Tag>
        ) : null}
      </span>

      <Icon name="chevron-right" size={16} scalable className="shrink-0 text-text-secondary" />
    </Link>
  );
}
