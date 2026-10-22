import type { ReactNode } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";

const RATING = {
  good: { icon: "thumb-up", color: "text-success-text", name: "내 평가: 잘 맞았어요" },
  bad: { icon: "thumb-down", color: "text-danger-action", name: "내 평가: 안 맞았어요" },
} as const;

export type BadgeProps =
  | {
      /** AI 요약 배지(명세 APP · AI 요약 배지). AI 가 정리한 설명임을 알린다. */
      readonly variant: "ai";
      /** 배지 글자. 기본은 'AI 요약' */
      readonly children?: ReactNode;
      readonly className?: string;
    }
  | {
      /**
       * 평가 배지(명세 APP · 평가 배지). 글자 없이 엄지 아이콘만 쓰는 원(28)이다. 선반 제품 행의 썸네일 오른쪽 아래에
       * 겹쳐 놓는다. 이름('내 평가: 잘 맞았어요')은 부품이 붙인다.
       */
      readonly variant: "rating";
      readonly rating: keyof typeof RATING;
      /**
       * 크기. 썸네일에 겹치는 행은 md(28 · 아이콘 16), 제품 메뉴 머리처럼 혼자 서는 자리는 lg(36 · 아이콘 20)다(S52d).
       */
      readonly size?: "md" | "lg";
      /** 자리. 썸네일 위에 겹칠 때 위치를 정한다. */
      readonly className?: string;
    };

/** 상태나 평가를 표시만 하고 누를 수 없는 배지. */
export function Badge(props: BadgeProps) {
  if (props.variant === "rating") {
    const rating = RATING[props.rating];
    const large = props.size === "lg";
    return (
      <span
        role="img"
        aria-label={rating.name}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-background",
          large ? "size-9" : "size-7",
          rating.color,
          props.className,
        )}
      >
        <Icon name={rating.icon} size={large ? 20 : 16} scalable />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-ai-soft px-2 text-caption leading-none font-semibold text-ai-text",
        props.className,
      )}
    >
      {/* 보라 글자(ui-ai)는 작은 글자 대비가 부족해 아이콘에만 쓴다. */}
      <Icon name="sparkles" filled size={12} scalable className="text-ai" />
      {props.children ?? "AI 요약"}
    </span>
  );
}
