"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

function TermsLink({ href, children }: { readonly href: string; readonly children: string }) {
  const { pressableProps } = usePressable();

  return (
    <Link href={href} {...pressableProps} className="pressable fb-surface rounded-xs font-medium text-text-secondary">
      {children}
    </Link>
  );
}

/** 로그인 버튼 아래 약관 안내(S37). */
export function TermsNotice() {
  return (
    <p className="text-center text-caption text-text-muted">
      시작하면 <TermsLink href="/terms">이용약관</TermsLink>과 <TermsLink href="/privacy">개인정보 처리방침</TermsLink>
      에 동의하게 돼요.
    </p>
  );
}
