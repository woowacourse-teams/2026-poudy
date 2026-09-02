"use client";

// biome-ignore assist/source/organizeImports: 저장소에서 강제하는 ESLint import 순서를 따른다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

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
type TravelDirection = "left" | "none" | "right";
type PendingSelection = {
  readonly direction: Exclude<TravelDirection, "none">;
  readonly index: number;
  readonly pathname: string;
  readonly requestId: number;
  readonly traveling: boolean;
};
type PendingActivation = {
  readonly index: number;
};

const SELECTION_TRAVEL_DURATION_MS = 280;

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
  const selectionRequestIdRef = useRef(0);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [pendingActivation, setPendingActivation] = useState<PendingActivation | null>(null);
  const currentSelection =
    pendingSelection !== null &&
    (pendingSelection.index === activeIndex || (pendingSelection.traveling && pendingSelection.pathname === pathname))
      ? pendingSelection
      : null;
  const selectedIndex = currentSelection?.index ?? activeIndex;
  const travelDirection: TravelDirection = currentSelection?.direction ?? "none";
  const traveling = currentSelection?.traveling ?? false;
  const activatedIndex = pendingActivation?.index ?? null;

  const selectTab = (index: number, active: boolean) => {
    if (active) {
      setPendingSelection(null);
      return;
    }

    selectionRequestIdRef.current += 1;
    const requestId = selectionRequestIdRef.current;
    setPendingSelection({
      direction: selectedIndex === null || index > selectedIndex ? "right" : "left",
      index,
      pathname,
      requestId,
      traveling: true,
    });
    window.setTimeout(() => {
      setPendingSelection((current) => {
        if (current === null || current.requestId !== requestId || !current.traveling) return current;
        return { ...current, traveling: false };
      });
    }, SELECTION_TRAVEL_DURATION_MS);
    setPendingActivation({ index });
    requestSelectionHaptic();
  };

  return (
    <nav aria-label="주요 메뉴" className="sticky bottom-0 border-t border-border bg-background">
      <ul
        className={`${styles.list} flex px-2 pt-2 pb-3.5`}
        data-selected-index={selectedIndex ?? "none"}
        data-travel-direction={travelDirection}
        data-traveling={traveling}
      >
        <li
          aria-hidden="true"
          className={styles.selection}
          onTransitionEnd={(event) => {
            if (event.propertyName !== "transform") return;
            setPendingSelection((current) => (current === null ? null : { ...current, traveling: false }));
          }}
        >
          <span className={styles.selectionBackground} />
        </li>

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
