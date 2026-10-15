"use client";

import type { ComponentType, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import type { FilledIconName } from "./icon";
import { usePressable } from "./use-pressable";
import { useVirtualKeyboardInset } from "./use-virtual-keyboard";

export type BottomNavigationTab = "home" | "category" | "explore" | "shelf" | "my";

/**
 * 탭 다섯 칸. 로그인 여부와 상관없이 이 하나만 쓴다(명세 APP · 하단 내비게이션). 주소는 앱의 경로가 정하므로
 * 기본값을 두고 hrefs 로 바꿀 수 있다.
 */
export const BOTTOM_NAVIGATION_TABS = [
  { tab: "home", label: "홈", icon: "home", href: "/" },
  { tab: "category", label: "카테고리", icon: "grid", href: "/categories" },
  { tab: "explore", label: "탐색", icon: "search", href: "/search" },
  { tab: "shelf", label: "선반", icon: "archive", href: "/shelf" },
  { tab: "my", label: "마이", icon: "user", href: "/my-page" },
] as const satisfies readonly {
  readonly tab: BottomNavigationTab;
  readonly label: string;
  readonly icon: FilledIconName;
  readonly href: string;
}[];

/** 링크로 그릴 요소. client 는 Next 의 Link 를 넘긴다. */
export type BottomNavigationLink = ComponentType<{
  readonly href: string;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly onClick?: () => void;
  readonly ref?: Ref<HTMLAnchorElement>;
  readonly "aria-current"?: "page";
}>;

export type BottomNavigationProps = {
  /** 지금 화면이 속한 탭. 어느 탭에도 속하지 않는 화면이면 null 이다. 경로로 정하는 일은 앱이 맡는다. */
  readonly current: BottomNavigationTab | null;
  /** 탭 링크로 그릴 요소. 기본은 a 다. */
  readonly linkAs?: BottomNavigationLink | "a";
  /** 탭별 주소. 넘기지 않은 탭은 BOTTOM_NAVIGATION_TABS 의 기본 주소로 간다. */
  readonly hrefs?: Partial<Record<BottomNavigationTab, string>>;
  /** 탭을 눌렀을 때. 햅틱처럼 이동 말고 더 할 일이 있을 때 쓴다. */
  readonly onSelect?: (tab: BottomNavigationTab) => void;
  /** 자리. 모양은 부품이 정한다. */
  readonly className?: string;
};

function NavigationItem({
  item,
  current,
  href,
  Link,
  onSelect,
}: {
  readonly item: (typeof BOTTOM_NAVIGATION_TABS)[number];
  readonly current: boolean;
  readonly href: string;
  readonly Link: BottomNavigationLink | "a";
  readonly onSelect?: (tab: BottomNavigationTab) => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <li className="flex min-w-0 flex-1">
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        onClick={onSelect ? () => onSelect(item.tab) : undefined}
        {...pressableProps}
        data-current={current ? "" : undefined}
        className="pressable fb-surface flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-text-secondary select-none data-current:text-brand-strong"
      >
        <Icon name={item.icon} size={24} filled={current} />
        <span
          className={cn(
            "max-w-full truncate text-label leading-none",
            current ? "font-semibold text-brand-text" : "font-medium",
          )}
        >
          {item.label}
        </span>
      </Link>
    </li>
  );
}

/**
 * 하단 내비게이션(LAYOUT L04, 명세 APP · 하단 내비게이션 · … 활성). 위치를 옮기는 링크라 지금 탭에
 * aria-current="page" 를 붙인다(STATE S06). 지금 탭은 채운 아이콘(ui-brand-strong)과 굵은 라벨(ui-brand-text)이다.
 *
 * 화면 골격(Screen)의 맨 아래에 둔다. body 형에서는 흐름의 끝에, document 형에서는 아래에 붙는다.
 * 입력에 포커스가 가 가상 키보드가 열리면 숨긴다(A11Y D07).
 */
export function BottomNavigation({ current, linkAs = "a", hrefs, onSelect, className }: BottomNavigationProps) {
  const keyboardInset = useVirtualKeyboardInset();

  return (
    <nav
      aria-label="주요 메뉴"
      hidden={keyboardInset > 0}
      className={cn(
        "sticky bottom-0 z-(--z-sticky) shrink-0 border-t border-border bg-background px-2 pt-2 pb-4",
        className,
      )}
    >
      <ul className="flex">
        {BOTTOM_NAVIGATION_TABS.map((item) => (
          <NavigationItem
            key={item.tab}
            item={item}
            current={current === item.tab}
            href={hrefs?.[item.tab] ?? item.href}
            Link={linkAs}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  );
}
