"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "./icons/Icon";

/**
 * 떠 있는 문의하기 버튼.
 *
 * 넓은 화면에서 본문은 폭이 제한되어 가운데 놓인다. fixed 로 두면 뷰포트 오른쪽에
 * 붙어 본문 밖으로 나가므로, 하단 내비게이션과 같이 sticky 로 흐름 안에 둔다.
 *
 * 자리를 차지하지 않도록 높이를 0 으로 두고 버튼만 위로 끌어올린다.
 * 끌어올리는 값은 버튼 높이(3rem)에 아래 여백을 더한 만큼이다.
 */
export function InquiryButton({ liftedAboveNavigation }: { readonly liftedAboveNavigation: boolean }) {
  const pathname = usePathname();

  return (
    <div
      className={`pointer-events-none sticky z-30 mt-auto flex h-0 justify-end px-4 ${
        /* 하단 내비게이션(72px)이 있는 화면에서는 그 위로 올린다. */
        liftedAboveNavigation
          ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -translate-y-[4rem]"
          : "bottom-0 -translate-y-[calc(4rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <Link
        href={`/inquiry?from=${encodeURIComponent(pathname)}`}
        aria-label="문의하기"
        /* 퍼진 그림자 앞에 1px 를 겹쳐 테두리를 겸한다. 배경이 연해 윤곽이 없으면 묻힌다. */
        className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_4px_12px_rgb(0_0_0/0.12)]"
      >
        {/* 봉투는 받은 편지함으로 읽혀 답장이 온 것처럼 보인다. 묻는 행동을 가리키는 모양을 쓴다. */}
        <Icon name="message-question" size={24} />
      </Link>
    </div>
  );
}
