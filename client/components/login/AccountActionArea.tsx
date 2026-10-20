"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 하단 행동 영역 · 두 버튼(명세 S55g · S55h · S55i). 큰 버튼 아래에 높이 44 글자 버튼을 하나 더 둔다.
 *
 * 디자인 시스템의 BottomActionBar 는 큰 버튼 하나만 받고, S55h · S55i 의 큰 버튼은 브랜드 색 로그인 버튼이다.
 * 그래서 두 버튼 영역은 BottomActionBar 와 같은 틀(위쪽 구분선 · 흰 바탕 · 거터 · 위 12 · 아래 안전 영역)로 여기서 짠다.
 * 토스트는 이 영역 바로 위에 뜬다(data-toast-offset, globals.css).
 */
export function AccountActionArea({ children }: { readonly children: ReactNode }) {
  return (
    <div
      data-toast-offset="two-actions"
      className="sticky bottom-0 z-(--z-sticky) flex shrink-0 flex-col gap-1 border-t border-border bg-background px-gutter pt-3 pb-safe"
    >
      {children}
    </div>
  );
}

type ActionTextLinkProps = {
  readonly href: string;
  readonly children: string;
};

/** 큰 버튼 아래의 보조 글자 버튼(높이 44). 지금 화면을 대신해 기록을 늘리지 않는다. */
export function ActionTextLink({ href, children }: ActionTextLinkProps) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      replace
      {...pressableProps}
      className="pressable fb-surface flex h-11 items-center justify-center rounded-xl px-3 text-body leading-snug font-semibold text-text-secondary"
    >
      {children}
    </Link>
  );
}
