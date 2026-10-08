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
          {/*
            기기에서 글자를 키워 이름과 배지가 한 줄에 들어가지 않으면 배지가 다음 줄로 내려간다.
            이름은 낱말 가운데서 끊지 않는다.
          */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <BottomSheet.Title className="max-w-full text-[20px] font-bold break-keep text-[#182132]">
              {title}
            </BottomSheet.Title>
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
          /*
            hover 하면 버튼 뒤에 옅은 원을 띄워 누를 수 있다는 것을 알린다. 머리 전체가 잡아 끄는
            자리라 커서가 손바닥으로 바뀌어 있는데, 단추 위에서는 누르는 손가락으로 되돌린다.
            원은 opacity 만 바꿔 다시 그리기를 피하고, 터치에서는 hover 대신 누르는 동안에만 띄운다.
            hover 는 색이 바뀌는 것이라 `ease` 로 두고, 누름은 손에 붙도록 더 짧은 press 길이로 답한다.
          */
          className="relative isolate flex size-11 shrink-0 cursor-pointer items-center justify-center text-[#182132] before:absolute before:inset-1 before:-z-10 before:rounded-full before:bg-[#EFF1F5] before:opacity-0 before:transition-opacity before:duration-control-state before:ease-[ease] before:content-[''] hover:before:opacity-100 active:before:bg-[#DEE2E9] active:before:opacity-100 active:before:duration-press"
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
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-2 gap-y-1">
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
    // 회색 막대가 글자로 순간 바뀌지 않게 옅게 들어온다. 자리를 옮기지 않으니 움직임 줄이기에서도 남긴다.
    return (
      <p className="text-pretty text-[14px] leading-[1.6] text-[#424E5F] transition-opacity duration-disclosure ease-out starting:opacity-0">
        {description.value}
      </p>
    );
  }
  if (description.status === "failed") {
    return <p className="text-[14px] leading-[1.6] text-[#566273]">설명을 불러오지 못했어요.</p>;
  }

  // 설명 두 줄 높이를 미리 잡아 두어 받아 온 뒤에 아래가 밀려나지 않게 한다.
  return (
    <div aria-busy="true" aria-label="설명을 불러오는 중" className="flex flex-col gap-2 py-1">
      {/* 끝나지 않는 깜빡임이라 움직임 줄이기를 켠 사용자에게는 멈춘 막대만 보인다. */}
      <span className="h-4 w-full animate-pulse rounded bg-[#EFF1F5] motion-reduce:animate-none" />
      <span className="h-4 w-3/5 animate-pulse rounded bg-[#EFF1F5] motion-reduce:animate-none" />
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
