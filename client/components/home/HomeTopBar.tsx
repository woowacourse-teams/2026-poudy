"use client";

import { Icon } from "@poudy/design-system/icon";
import { BOUNDARY_MARKER, usePassedTop } from "@poudy/design-system/screen";
import { usePressable } from "@poudy/design-system/use-pressable";
import Image from "next/image";
import Link from "next/link";

import { track } from "@/lib/analytics/track";
import { SITE_NAME } from "@/lib/seo/site";

/**
 * 홈 머리(명세 S20 'Home Renewal · TopBar'). 높이 54, 왼쪽에 서비스 로고, 오른쪽에 검색 화면으로 가는 링크다.
 * 명세는 '홈' 제목(20/700)이지만 홈만은 로고를 둔다(10/22 결정). 로고 높이는 제목 글자 크기(1em)에 맞춰,
 * 기기 글자 크기를 키우면 함께 커진다. 로고의 대체 텍스트가 이 화면의 제목(h1)이 된다.
 *
 * 디자인 시스템 TopBar(large)는 제목이 28 이고 오른쪽 행동이 버튼(onClick)만 된다. 홈은 제목이 20 이고(TYPO 루트 화면
 * 제목) 검색은 다른 화면으로 가는 링크라 새 탭으로도 열려야 해서(A11Y), 같은 규칙(sticky, 붙은 동안만 아래 선)으로 따로 그린다.
 */
export function HomeTopBar() {
  const { ref, passed } = usePassedTop<HTMLDivElement>();
  const { pressableProps } = usePressable();

  return (
    <>
      {/* 붙는 바 앞의 표식. 붙었는지 아는 데 쓰고, 화면을 옮길 때 새 화면의 첫 요소로 스크롤을 맞추는 데도 쓰인다. */}
      <div ref={ref} aria-hidden="true" className={BOUNDARY_MARKER} />
      <header
        data-stuck={passed ? "" : undefined}
        className="sticky top-0 z-(--z-sticky) flex min-h-13.5 shrink-0 items-center justify-between gap-2 bg-background pr-1.5 pl-(--gutter) after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-transparent after:transition-colors after:duration-(--duration-fast) data-stuck:after:bg-border"
      >
        {/* 줄 높이를 1 로 두어 로고 높이(h-lh)가 글자 크기와 같아지게 한다. */}
        <h1 className="flex min-w-0 text-screen leading-none">
          <Image
            src="/logo.webp"
            alt={SITE_NAME}
            width={226}
            height={296}
            draggable={false}
            loading="eager"
            className="h-lh w-auto shrink-0 select-none"
          />
        </h1>
        {/* 아이콘(24) 끝이 화면 끝 16 에 오도록 오른쪽을 6 만 둔다. 누르는 영역은 44, 피드백 원은 36 이다(STATE S04). */}
        <Link
          href="/search/products"
          aria-label="검색"
          {...pressableProps}
          onClick={() => track("home_search_selected", { placement: "top_bar" })}
          className="pressable fb-circle flex size-11 shrink-0 items-center justify-center rounded-full text-text-primary select-none [&>svg]:relative"
        >
          <Icon name="search" size={24} />
        </Link>
      </header>
    </>
  );
}
