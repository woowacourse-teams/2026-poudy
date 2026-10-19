"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 포함 제품 목록으로 가는 링크(명세 BTN · Primary · 뒤 아이콘, 높이 48).
 * 다른 화면으로 가는 일이라 버튼이 아니라 링크다. 패키지 Button 은 링크로 그릴 수 없어 같은 모양과 상태(fb-dim, press-scale)를 옮겼다.
 *
 * 기기에서 글자를 키워 한 줄에 다 들어가지 않으면 높이를 늘려 다음 줄로 넘긴다. 그래서 높이는 최소값으로 둔다.
 */
export function ProductsLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      {...pressableProps}
      className="pressable press-scale fb-dim flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-4 py-3 text-body leading-snug font-semibold text-action-text"
    >
      {children}
      <Icon name="chevron-right" size={16} scalable />
    </Link>
  );
}

/**
 * 성분 행(명세 S25a 성분군 성분, S24a 계열 성분). 이름 15/600 · 영문명 13 muted · 꺾쇠 16.
 * 행 전체가 링크다. 스크롤 목록의 행이라 눌림은 80ms 기다렸다가 켜고, 크기 피드백은 붙이지 않는다(STATE S07 · S09).
 */
export function IngredientRowLink({
  href,
  koreanName,
  englishName,
  onClick,
}: {
  readonly href: string;
  readonly koreanName: string;
  readonly englishName: string | null;
  /** 시트에서 성분 설명으로 옮겨 갈 때 시트를 떠난 것으로 남긴다. */
  readonly onClick?: () => void;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={href}
      onClick={onClick}
      {...pressableProps}
      className="pressable fb-surface flex min-h-15 items-center gap-3 py-3"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-title font-semibold break-keep text-text-primary">{koreanName}</span>
        {englishName ? <span className="text-body-sm leading-snug text-text-muted">{englishName}</span> : null}
      </span>
      <Icon name="chevron-right" size={16} scalable className="text-text-muted" />
    </Link>
  );
}

/**
 * 보조 버튼 모양의 링크(명세 BTN · Secondary, 높이 48). 시트 아래의 '자세히 보기'와 없는 성분 화면의 [성분 검색하기]가 쓴다.
 * 패키지 Button 은 링크로 그릴 수 없어 같은 모양과 상태(fb-secondary, press-scale)를 옮겼다.
 */
export function SecondaryLink({
  href,
  onClick,
  fill = false,
  children,
}: {
  readonly href: string;
  readonly onClick?: () => void;
  /** 폭을 채울지. 시트 아래 버튼은 채우고, 빈 상태의 행동은 글자에 맞춘다. */
  readonly fill?: boolean;
  readonly children: ReactNode;
}) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      onClick={onClick}
      {...pressableProps}
      className={cn(
        "pressable press-scale fb-secondary flex min-h-12 items-center justify-center rounded-xl bg-button-secondary px-4 py-3 text-center text-body leading-snug font-semibold text-text-primary",
        fill && "w-full",
      )}
    >
      {children}
    </Link>
  );
}
