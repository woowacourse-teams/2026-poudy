"use client";

import { Button } from "@poudy/design-system/button";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { Icon } from "@/components/ui/icons/Icon";

/** '자세히 보기'. 선반 소개 페이지(/shelf/guide)로 간다. */
export function GuideLink({ onNavigate }: { readonly onNavigate?: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/shelf/guide"
      onClick={onNavigate}
      {...pressableProps}
      className="pressable fb-surface flex h-11 items-center justify-center gap-0.5 rounded-xl text-body leading-none font-semibold text-text-primary"
    >
      자세히 보기
      <Icon name="chevron-right" size={16} strokeWidth={2} className="text-text-secondary" />
    </Link>
  );
}

type ShelfIntroActionsProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly onNavigate?: () => void;
};

/** 선반 소개 본문 아래의 버튼 묶음. 주 버튼과 '자세히 보기'를 세로로 둔다(S54a·S54b·S54c). */
export function ShelfIntroActions({ label, onPress, onNavigate }: ShelfIntroActionsProps) {
  return (
    <div className="flex flex-col gap-1 pt-4">
      <Button className="w-full" onClick={onPress}>
        {label}
      </Button>
      <GuideLink onNavigate={onNavigate} />
    </div>
  );
}
