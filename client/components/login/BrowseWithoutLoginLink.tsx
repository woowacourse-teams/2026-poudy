"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

/** '로그인 없이 둘러보기'(높이 44 글자 버튼). 로그인 화면과 가입 확인 시트, 업데이트 안내가 함께 쓴다. */
export function BrowseWithoutLoginLink() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/"
      replace
      {...pressableProps}
      className="pressable fb-surface flex h-11 items-center justify-center rounded-xl px-3 text-body leading-snug font-semibold text-text-secondary"
    >
      로그인 없이 둘러보기
    </Link>
  );
}
