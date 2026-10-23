"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { ReactNode } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { formatEnglishName } from "@/lib/domain/format";

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
 * 성분 타일(명세 S25a 성분군 성분, S24a 시트와 같은 타일). 회색 면 · 반경 12 · 안쪽 12, 한글명 13/600 · 영문명 12 muted.
 * 타일 전체가 링크다. 스크롤 목록 안이라 눌림은 80ms 기다렸다가 켜고, 회색 면 위라 한 단계 진한 면(fb-border)으로 그린다(STATE S07 · S09).
 * 성분 이름은 띄어쓰기 없이 길어서, 낱말 사이에서 먼저 줄을 바꾸고 그래도 넘치면 칸 안 어디서든 바꾼다.
 */
export function IngredientTileLink({
  href,
  entryPoint,
  koreanName,
  englishName,
}: {
  readonly href: string;
  readonly entryPoint?: string;
  readonly koreanName: string;
  readonly englishName: string | null;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      href={href}
      entryPoint={entryPoint}
      {...pressableProps}
      className="pressable fb-border flex h-full flex-col gap-0.5 rounded-lg bg-surface p-3"
    >
      <span className="text-body-sm leading-snug font-semibold break-keep wrap-anywhere text-text-primary">
        {koreanName}
      </span>
      {englishName ? (
        <span className="text-caption wrap-anywhere text-text-muted">{formatEnglishName(englishName)}</span>
      ) : null}
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
