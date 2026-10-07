"use client";

import Link from "next/link";

import { AiSummaryBadge } from "./AiSummaryBadge";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/icons/Icon";
import type { SheetDescription } from "@/lib/hooks/useSheetDescription";

/**
 * 시트 머리. 이름 아래에 영문명과 태그가 붙고, 오른쪽에 닫기 단추가 있다.
 * 머리 전체를 잡아 끌어 닫을 수 있다.
 */
export function SheetHead({
  title,
  badge,
  englishName,
  tags,
  onClose,
}: {
  readonly title: string;
  readonly badge?: React.ReactNode;
  readonly englishName?: string | null;
  readonly tags?: React.ReactNode;
  readonly onClose: () => void;
}) {
  return (
    <BottomSheet.CustomHeader>
      <div className="flex gap-2 pt-2 pr-2 pl-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2 pb-2">
          <div className="flex items-center gap-2">
            <BottomSheet.Title className="min-w-0 text-[20px] font-bold text-[#182132]">{title}</BottomSheet.Title>
            {badge}
          </div>
          {englishName ? <p className="text-[13px] text-[#566273]">{englishName}</p> : null}
          {tags}
        </div>

        <button
          type="button"
          onClick={onClose}
          // 끌어 닫기가 머리 전체를 잡고 있어 단추를 누르는 손도 끌기로 읽힌다. 단추에서는 끌기를 시작하지 않는다.
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="닫기"
          className="flex size-11 shrink-0 items-center justify-center text-[#182132]"
        >
          <Icon name="x" size={22} />
        </button>
      </div>
    </BottomSheet.CustomHeader>
  );
}

/** `무슨 역할을 하나요?` 머리와 설명. 설명은 시트를 연 뒤에 받아 온다. */
export function RoleDescription({
  description,
  children,
}: {
  readonly description: SheetDescription<string>;
  readonly children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex h-7 items-center justify-between">
        <h3 className="text-[15px] font-bold text-[#182132]">무슨 역할을 하나요?</h3>
        <AiSummaryBadge />
      </div>

      <DescriptionText description={description} />
      {children}
    </section>
  );
}

function DescriptionText({ description }: { readonly description: SheetDescription<string> }) {
  if (description.status === "loaded") {
    return <p className="text-pretty text-[14px] leading-[1.6] text-[#424E5F]">{description.value}</p>;
  }
  if (description.status === "failed") {
    return <p className="text-[14px] leading-[1.6] text-[#566273]">설명을 불러오지 못했어요.</p>;
  }

  // 설명 두 줄 높이를 미리 잡아 두어 받아 온 뒤에 아래가 밀려나지 않게 한다.
  return (
    <div aria-busy="true" aria-label="설명을 불러오는 중" className="flex flex-col gap-2 py-1">
      <span className="h-4 w-full animate-pulse rounded bg-[#EFF1F5]" />
      <span className="h-4 w-3/5 animate-pulse rounded bg-[#EFF1F5]" />
    </div>
  );
}

/** 시트 맨 아래의 이동 단추. 시트에 담지 못한 설명은 상세 화면에서 본다. */
export function SheetDetailLink({ href, children }: { readonly href: string; readonly children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-12 w-full items-center justify-center rounded-[14px] bg-[#EFF1F5] px-4 text-[14px] font-semibold text-[#182132]"
    >
      <span className="truncate">{children}</span>
    </Link>
  );
}
