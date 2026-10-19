"use client";

import type { ComponentType, ReactNode, Ref } from "react";

import { cn } from "./cn";
import { Icon } from "./icon";
import type { FilledIconName } from "./icon";
import { usePressable } from "./use-pressable";
import { useVirtualKeyboardInset } from "./use-virtual-keyboard";

/**
 * 탭 한 칸. 어떤 탭을 어떤 순서로 두고 어디로 보낼지는 앱의 정보 구조라 앱이 정해서 넘긴다. 부품은 칸 배치, 지금 탭 모양,
 * 키보드가 열릴 때 숨기기, 접근성만 맡는다. 지금 탭은 채운 아이콘으로 그리므로 채움 그림이 있는 아이콘만 쓸 수 있다.
 */
export type BottomNavigationItem<K extends string = string> = {
  /** 탭을 가리키는 이름. current 와 onSelect 가 이 값을 쓴다. */
  readonly key: K;
  readonly label: string;
  readonly icon: FilledIconName;
  readonly href: string;
};

/** 링크로 그릴 요소. client 는 Next 의 Link 를 넘긴다. */
export type BottomNavigationLink = ComponentType<{
  readonly href: string;
  readonly className?: string;
  readonly children?: ReactNode;
  readonly onClick?: () => void;
  readonly ref?: Ref<HTMLAnchorElement>;
  readonly "aria-current"?: "page";
}>;

export type BottomNavigationProps<K extends string> = {
  /** 탭 목록. 명세는 다섯 칸이다(APP · 하단 내비게이션). 로그인 여부와 상관없이 같은 목록을 쓴다. */
  readonly items: readonly BottomNavigationItem<K>[];
  /** 지금 화면이 속한 탭의 key. 어느 탭에도 속하지 않는 화면이면 null 이다. 경로로 정하는 일은 앱이 맡는다. */
  readonly current: K | null;
  /** 탭 링크로 그릴 요소. 기본은 a 다. */
  readonly linkAs?: BottomNavigationLink | "a";
  /** 탭을 눌렀을 때. 햅틱처럼 이동 말고 더 할 일이 있을 때 쓴다. */
  readonly onSelect?: (key: K) => void;
  /** 자리. 모양은 부품이 정한다. */
  readonly className?: string;
};

function NavigationItem<K extends string>({
  item,
  current,
  Link,
  onSelect,
}: {
  readonly item: BottomNavigationItem<K>;
  readonly current: boolean;
  readonly Link: BottomNavigationLink | "a";
  readonly onSelect?: (key: K) => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <li className="flex min-w-0 flex-1">
      <Link
        href={item.href}
        aria-current={current ? "page" : undefined}
        onClick={onSelect ? () => onSelect(item.key) : undefined}
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
export function BottomNavigation<K extends string>({
  items,
  current,
  linkAs = "a",
  onSelect,
  className,
}: BottomNavigationProps<K>) {
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
        {items.map((item) => (
          <NavigationItem key={item.key} item={item} current={current === item.key} Link={linkAs} onSelect={onSelect} />
        ))}
      </ul>
    </nav>
  );
}
