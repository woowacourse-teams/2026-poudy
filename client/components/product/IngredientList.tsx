"use client";

import type { ProductIngredientResponse, ProductPartResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useState } from "react";

import { EffectIcon, effectLabel } from "@/components/ingredient/EffectTag";

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
 * 접힌 동안에는 앞 5개만 보인다. 뒤에 주의 성분이 있어도 따로 꺼내 보이지 않는다. 주의 성분은 위의 주의 성분 확인이
 * 이미 알리므로, 목록은 표기 순서 그대로 둔다(10/22 결정).
 */
export function IngredientList({ ingredients }: IngredientListProps) {
  const [expanded, setExpanded] = useState(false);
  const { pressableProps } = usePressable();

  const hiddenCount = Math.max(0, ingredients.length - COLLAPSED_COUNT);
  const shown = (index: number) => expanded || index < COLLAPSED_COUNT;

  return (
    <div className="flex flex-col gap-3">
      {/* 나눔선은 행마다 아래에만 긋는다. 목록 위에는 긋지 않고, 마지막 행 아래 선이 펼치기 버튼과 목록을 나눈다(S24). */}
      <ol className="w-full">
        {ingredients.map((ingredient, index) => (
          <li key={ingredient.id} hidden={!shown(index)} className="border-b border-border">
            <IngredientRow ingredient={ingredient} order={index + 1} />
          </li>
        ))}
      </ol>

      {hiddenCount > 0 && (
        <button
          type="button"
          {...pressableProps}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="pressable fb-secondary press-scale flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-button-secondary px-4 py-2 text-center text-13 leading-snug font-semibold text-text-primary"
        >
          {expanded ? "성분 목록 접기" : `나머지 ${hiddenCount}개 성분 펼쳐보기`}
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

/**
 * 전성분 한 행(명세 '임시 · 태그 여러 개 시험'의 A안).
 * - 피부 작용은 성분명 바로 옆에 아이콘만 둔다(14 · 보조색, 아이콘 사이 2). 글자 태그로 두면 작용이 둘만 돼도 이름 칸을 밀어낸다.
 * - 오른쪽에는 주의 성분군 태그를 모두 둔다. 목록에서 색을 쓰는 것은 주의뿐이라, 무엇에 걸렸는지를 빠짐없이 보인다.
 */
function IngredientRow({
  ingredient,
  order,
}: {
  readonly ingredient: ProductIngredientResponse;
  readonly order: number;
}) {
  // 스크롤하다 스친 행이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });
  const effects = ingredient.skinEffects;

  return (
    <Link
      href={`/ingredients/${ingredient.id}`}
      prefetch="auto"
      {...pressableProps}
      className="pressable fb-bleed flex min-h-15 items-center gap-2 px-0.5 py-3"
    >
      {/* 순번 칸은 글자를 따라 넓어지게 최소 폭만 준다. 1배에서는 24px 그대로다. */}
      <span className="flex h-7 min-w-6 shrink-0 items-center justify-center text-label text-text-secondary tabular-nums">
        {String(order).padStart(2, "0")}
      </span>

      {/*
        이름 칸과 주의 태그를 한 묶음으로 두고, 자리가 모자라면 태그가 이름 아래 줄 오른쪽으로 내려가게 한다.
        이름 칸은 글자 폭을 기본 폭으로 삼는다(grow). 기기에서 글자를 키워도 이름이 태그에 밀려
        낱말 가운데서 갈라지기 전에 태그가 먼저 다음 줄로 넘어간다. 1배에서는 한 줄 그대로다.
      */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span className="flex min-w-24 grow flex-col gap-0.5">
          {/*
            이름과 아이콘은 글줄로 흘린다. 이름은 낱말 단위로만 줄을 바꾸고(break-keep), 아이콘 자리가 모자라면
            아이콘이 다음 줄로 넘어간다. 한 줄보다 긴 낱말만 글자 사이에서 갈라진다(wrap-break-word).
          */}
          <span className="text-13 leading-snug font-semibold break-keep wrap-break-word text-text-primary">
            {ingredient.koreanName}
            {/* 아이콘은 보이는 글자가 없으므로 묶음을 그림 하나로 두고 작용 이름을 붙인다. 작용이 없으면 두지 않는다. */}
            {effects.length > 0 ? (
              <>
                {" "}
                <span
                  role="img"
                  aria-label={effects.map(effectLabel).join(", ")}
                  className="inline-flex gap-0.5 align-middle text-text-secondary"
                >
                  {effects.map((effect) => (
                    <EffectIcon key={effect.code} code={effect.code} size={14} />
                  ))}
                </span>
              </>
            ) : null}
          </span>
          <span className="text-caption text-text-secondary">
            {ingredient.formulationRoles.map((role) => role.name).join(" · ")}
          </span>
        </span>

        {/*
          태그 묶음은 줄어들 수 있게 둔다. 글자를 키워 태그 줄이 행보다 넓어지면 묶음 안에서 태그가 다음 줄로 넘어가고,
          오른쪽 정렬 때문에 왼쪽 순번 칸까지 밀려 나가지 않는다. 가장 넓은 태그 하나보다는 줄지 않는다.
        */}
        {ingredient.cautions.length > 0 ? (
          <span className="flex flex-wrap items-center justify-end gap-2">
            {ingredient.cautions.map((caution) => (
              <Tag key={caution.code} variant="label" tone="caution">
                {caution.label}
              </Tag>
            ))}
          </span>
        ) : null}
      </span>

      <Icon name="chevron-right" size={16} scalable className="shrink-0 text-text-secondary" />
    </Link>
  );
}
