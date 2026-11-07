"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Icon } from "./icons/Icon";

/**
 * 떠 있는 문의하기 버튼.
 *
 * 넓은 화면에서 본문은 폭이 제한되어 가운데 놓인다. fixed 로 두면 뷰포트 오른쪽에
 * 붙어 본문 밖으로 나가므로, sticky 로 흐름 안에 둔다.
 *
 * 자리를 차지하지 않도록 높이를 0 으로 두고 버튼만 위로 끌어올린다.
 * 끌어올리는 값은 버튼 높이(3rem)에 아래 간격(--floating-gap)을 더한 만큼이다.
 *
 * 자리의 규칙은 하나다. 바로 아래에 있는 것 위 --floating-gap 에 뜬다. 아래 줄의 높이를 bottom 으로 두고, 떠 있는 것이나
 * 오르내리는 것의 높이를 끌어올리는 값에 더한다.
 *
 * 버튼이 본문 끝을 덮지 않도록, 버튼이 있는 화면은 본문 끝에 pb-inquiry(5rem)를 둔다(globals.css).
 * 층은 하단 내비(--z-sticky)보다 위, 시트 딤보다 아래인 --z-floating 이다.
 */
export type InquiryButtonLift = "bottom-navigation" | "bottom-action-bar" | "none";

/* 화면 아래에 붙은 줄이 있으면 그 위로 올린다. */
const bottomClass = (lift: InquiryButtonLift): string => {
  if (lift === "bottom-navigation") return "bottom-[var(--bottom-navigation-height)]";
  if (lift === "bottom-action-bar") return "bottom-[var(--bottom-action-bar-height)]";
  return "bottom-0";
};

export function InquiryButton({ lift }: { readonly lift: InquiryButtonLift }) {
  const pathname = usePathname();
  const router = useRouter();
  const { pressableProps } = usePressable();

  /* 조건이 없을 때 그대로 쓰는 주소. 링크의 href 는 이 값으로 둔다. */
  const href = `/inquiry?from=${encodeURIComponent(pathname)}`;

  /*
   * 조건은 누르는 순간 주소에서 읽어 붙인다. useSearchParams 로 읽으면 이 버튼이
   * 레이아웃에 있어 모든 화면이 Suspense 경계를 요구하고, 미리 만들어 두는 화면까지
   * 무너진다.
   *
   * href 를 비워 두지 않는 까닭은 이것이 링크이기 때문이다. 새 탭으로 열거나 주소를
   * 미리 보는 길을 막지 않는다. 그때는 조건 없이 경로만 담긴 주소로 열린다.
   */
  const openWithSearch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    /* 새 탭이나 새 창으로 여는 중이면 브라우저에 맡긴다. */
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    const search = window.location.search;
    if (!search) return;

    event.preventDefault();
    router.push(`/inquiry?from=${encodeURIComponent(pathname + search)}`);
  };

  return (
    <div
      /* 비교함과 제품 상세의 하단 고정 바가 나타나고 사라지면, 그 움직임과 같은 길이 · 곡선으로 함께 움직인다. */
      className={`pointer-events-none sticky z-(--z-floating) mt-auto flex h-0 -translate-y-[calc(var(--floating-gap)+3rem+var(--bottom-action-bar-above-nav-measured,0px)+var(--comparison-float-height)+var(--wishlist-shelf-bar-lift,0px))] justify-end px-gutter transition-transform duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none ${bottomClass(lift)}`}
    >
      <Link
        href={href}
        {...pressableProps}
        onClick={openWithSearch}
        aria-label="문의하기"
        /* 퍼진 그림자 앞에 1px 를 겹쳐 테두리를 겸한다. 배경이 연해 윤곽이 없으면 묻힌다. */
        className="pressable press-scale fb-tint-brand pointer-events-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_4px_12px_rgb(0_0_0/0.12)]"
      >
        {/* 봉투는 받은 편지함으로 읽혀 답장이 온 것처럼 보인다. 묻는 행동을 가리키는 모양을 쓴다. */}
        <Icon name="message-question" size={24} />
      </Link>
    </div>
  );
}
