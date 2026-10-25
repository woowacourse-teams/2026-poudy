"use client";

import { BottomNavigation } from "@poudy/design-system/bottom-navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { BOTTOM_NAVIGATION_TABS, bottomNavigationTabOf, isBottomNavigationPath } from "./bottom-navigation-path";

import { useShelfEntry } from "@/lib/hooks/useShelfEntry";
import { requestSelectionHaptic } from "@/lib/interaction/haptic";

function NavigationLink(props: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const { ref: entryRef, select: selectEntry } = useShelfEntry({
    source: "bottom_navigation",
    placement: "tab",
    viewKey: pathname,
    enabled: props.href === "/shelf" && props["aria-current"] !== "page",
  });
  return (
    <Link
      {...props}
      ref={(node) => {
        entryRef(node);
        if (typeof props.ref === "function") return props.ref(node);
        if (props.ref) props.ref.current = node;
      }}
      onNavigate={(event) => {
        selectEntry();
        props.onNavigate?.(event);
      }}
    />
  );
}

/**
 * 하단 내비게이션을 보여 줄 경로에서만 그린다(bottom-navigation-path). 모양과 키보드가 열릴 때 숨기는 일은 패키지 부품이 맡고,
 * 여기서는 탭 목록을 넘기고 경로로 지금 탭을 정하고 다른 탭을 누르면 앱에 선택 햅틱을 요청한다.
 *
 * 부품은 본문 흐름의 맨 끝에 붙는다(sticky). 본문이 짧은 화면에서도 화면 아래에 오도록 mt-auto 로 남는 높이를 밀어낸다.
 * data-bottom-navigation 은 스크롤 막대(AppScrollIndicator)가 내비 높이를 재는 데 쓴다.
 */
export function BottomNavigationSlot() {
  const pathname = usePathname();
  if (!isBottomNavigationPath(pathname)) return null;

  const current = bottomNavigationTabOf(pathname);

  return (
    <div data-bottom-navigation className="contents">
      <BottomNavigation
        items={BOTTOM_NAVIGATION_TABS}
        current={current}
        linkAs={NavigationLink}
        onSelect={(tab) => {
          if (tab !== current) requestSelectionHaptic();
        }}
        className="mt-auto"
      />
    </div>
  );
}
