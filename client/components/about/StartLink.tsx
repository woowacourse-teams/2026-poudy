"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { useShelfEntry } from "@/lib/hooks/useShelfEntry";

/*
 * 모양은 디자인 시스템 Button 의 md 와 같다. 누름·hover 피드백(press-scale · fb-*)은 usePressable 이 붙이는
 * data-pressed · data-hovered 에 걸려 있어, 클래스만 빌려 오면 눌러도 반응하지 않는다. 그래서 훅을 함께 쓴다.
 */
const BASE =
  "pressable press-scale inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-center text-14 leading-none font-semibold break-keep lg:w-50";

const VARIANTS = {
  primary: "fb-dim bg-action text-action-text",
  secondary: "fb-secondary bg-button-secondary text-text-primary",
} as const;

type StartLinkProps = {
  readonly href: string;
  readonly variant: keyof typeof VARIANTS;
  readonly children: string;
};

/**
 * 서비스 소개(S56) 시작 카드의 버튼. 다른 화면으로 가는 것이라 button 이 아니라 링크로 둔다(검색 엔진도 따라간다).
 */
export function StartLink({ href, variant, children }: StartLinkProps) {
  const { pressableProps } = usePressable();
  const { ref: entryRef, select: selectEntry } = useShelfEntry({
    source: "about",
    placement: variant,
    enabled: href === "/shelf",
  });

  return (
    <Link
      href={href}
      ref={entryRef}
      onNavigate={selectEntry}
      {...pressableProps}
      className={`${BASE} ${VARIANTS[variant]}`}
    >
      {children}
    </Link>
  );
}
