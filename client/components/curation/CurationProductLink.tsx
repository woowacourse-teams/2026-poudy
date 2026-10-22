"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

/**
 * 큐레이션의 제품 링크 블록. 기획자가 고른 조건을 건 상품 목록으로 간다.
 *
 * 모양은 본문 안 주 버튼(명세 BTN · Primary, 높이 48)이다. 다른 화면으로 가는 링크라 새 탭으로도 열려야 하는데
 * 디자인 시스템 Button 은 button 요소만 그려, 같은 클래스와 눌림 훅으로 링크를 그린다.
 */
export function CurationProductLink({ href, label }: { readonly href: string; readonly label: string }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href={href}
      {...pressableProps}
      className="pressable press-scale fb-dim flex min-h-12 w-full items-center justify-center rounded-xl bg-action px-4 py-3 text-center text-14 leading-snug font-semibold text-action-text select-none"
    >
      {label}
    </Link>
  );
}
