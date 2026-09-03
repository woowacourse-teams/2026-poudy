"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { matchesPathSegment } from "./bottom-navigation-path";
import styles from "./BottomNavigation.module.css";
import { Icon } from "./icons/Icon";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";

const TABS = [
  { href: "/", label: "홈", icon: "home", match: (path: string) => path === "/" },
  {
    href: "/categories",
    label: "카테고리",
    icon: "grid",
    match: (path: string) => matchesPathSegment(path, "/categories") || matchesPathSegment(path, "/brands"),
  },
  {
    href: "/search/products",
    label: "탐색",
    icon: "search",
    match: (path: string) =>
      matchesPathSegment(path, "/search") ||
      matchesPathSegment(path, "/products") ||
      matchesPathSegment(path, "/ingredients"),
  },
  { href: "/saved", label: "저장", icon: "bookmark", match: (path: string) => matchesPathSegment(path, "/saved") },
] as const;

type TabIcon = (typeof TABS)[number]["icon"];
type PendingSelection = {
  readonly index: number;
  readonly pathname: string;
};
type PendingActivation = {
  readonly index: number;
};

function getActiveIndex(pathname: string): number | null {
  const index = TABS.findIndex((tab) => tab.match(pathname));
  return index === -1 ? null : index;
}

type NavigationIconProps = {
  readonly activated: boolean;
  readonly filled: boolean;
  readonly name: TabIcon;
  readonly onAnimationEnd: () => void;
};

function NavigationIcon({ activated, filled, name, onAnimationEnd }: NavigationIconProps) {
  return (
    <span
      className={styles.icon}
      data-activated={activated}
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target) onAnimationEnd();
      }}
    >
      <Icon name={name} size={20} filled={filled} />
    </span>
  );
}

/** 디자인 C01·C02. 활성 탭은 경로에서 정한다. */
export function BottomNavigation() {
  const pathname = usePathname();
  const activeIndex = getActiveIndex(pathname);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [pendingActivation, setPendingActivation] = useState<PendingActivation | null>(null);

  /*
   * 낙관적 선택은 누른 경로에 머무는 동안에만 쓴다. 경로가 실제로 바뀌면 버린다.
   * 눌렀던 경로로 되돌아오는 경우가 있어 경로를 비교하는 것만으로는 부족하다.
   * 되돌아온 시점에 다시 조건이 맞아 지나간 선택이 되살아난다.
   */
  if (pendingSelection !== null && pendingSelection.pathname !== pathname) {
    setPendingSelection(null);
  }

  const currentSelection = pendingSelection?.pathname === pathname ? pendingSelection : null;
  const selectedIndex = currentSelection?.index ?? activeIndex;
  const activatedIndex = pendingActivation?.index ?? null;

  const selectTab = (index: number, active: boolean) => {
    if (active) {
      setPendingSelection(null);
      return;
    }

    setPendingSelection({ index, pathname });
    setPendingActivation({ index });
    requestSelectionHaptic();
  };

  return (
    <nav aria-label="주요 메뉴" className="sticky bottom-0 border-t border-border bg-background">
      <ul className={`${styles.list} flex px-2 pt-2 pb-3.5`}>
        {TABS.map((tab, index) => {
          const active = tab.match(pathname);
          const selected = selectedIndex === index;
          return (
            <li key={tab.href} className={`${styles.item} flex-1`} data-selected={selected}>
              <span className={styles.hoverBackground} aria-hidden="true" />
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                data-activated={activatedIndex === index}
                data-selected={selected}
                onClick={() => selectTab(index, active)}
                className={[
                  styles.link,
                  "relative flex flex-col items-center gap-1 py-1 text-[11px]",
                  selected ? "font-bold text-brand" : "font-medium text-text-secondary",
                ].join(" ")}
              >
                <NavigationIcon
                  name={tab.icon}
                  filled={selected}
                  activated={activatedIndex === index}
                  onAnimationEnd={() => setPendingActivation(null)}
                />
                <span className="relative z-10">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
