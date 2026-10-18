"use client";

import { cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "./cn";
import { Slot } from "./slot";
import { TabLabel } from "./tabs";
import { usePressable } from "./use-pressable";

export type TabNavProps = ({ readonly "aria-label": string } | { readonly "aria-labelledby": string }) & {
  /** TabNavItem 들 */
  readonly children: ReactNode;
  /** 자리. 모양은 부품이 정하므로 여백·폭만 바꾼다. */
  readonly className?: string;
};

/**
 * 다른 화면으로 가는 링크 탭(STATE S06 '위치 이동', A11Y D04). 검색 모드 탭(?mode=)과 카테고리·브랜드 전환
 * (/categories ↔ /brands)이 해당한다. 같은 화면의 패널만 바꾸는 탭은 Tabs 를 쓴다.
 *
 * 링크이므로 뒤로 가기 기록에 남고 새 탭에서 열 수 있다. Tab 키로 탭마다 멈추고 Enter 로 이동한다. 방향키 전환은 없다.
 * 높이 44, 탭이 폭을 똑같이 나누고, 고른 탭은 15/700 + 2px 밑줄이다. 기기 글자 크기를 키워 이름이 탭 폭을 넘으면
 * 넘치지 않고 줄을 바꾸며, 탭 높이가 글자를 따라 늘어난다(A11Y 글자 200%).
 */
export function TabNav({ children, className, ...name }: TabNavProps) {
  return (
    <nav {...name} className={cn("flex border-b border-border", className)}>
      {children}
    </nav>
  );
}

export type TabNavItemProps = {
  /** 지금 보고 있는 화면의 탭. aria-current="page" 를 붙인다. */
  readonly current: boolean;
  /** 탭 요소로 쓸 링크(client 의 Link) 하나. 안의 글자는 TabLabel 로 감싸져 고를 때 폭이 바뀌지 않는다. */
  readonly children: ReactElement<{ readonly children?: ReactNode }>;
};

export function TabNavItem({ current, children }: TabNavItemProps) {
  const { pressableProps } = usePressable();
  const label = children.props.children;

  return (
    <Slot
      {...pressableProps}
      aria-current={current ? "page" : undefined}
      data-current={current ? "" : undefined}
      className="pressable fb-surface -mb-px flex min-h-11 flex-1 basis-0 items-center justify-center border-b-2 border-transparent px-3 py-2 text-center text-title leading-snug font-medium text-text-secondary select-none data-current:border-text-primary data-current:font-bold data-current:text-text-primary"
    >
      {cloneElement(children, { children: <TabLabel>{label}</TabLabel> })}
    </Slot>
  );
}
