"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "./icons/Icon";

const TABS = [
  { href: "/", label: "홈", icon: "home", match: (path: string) => path === "/" },
  {
    href: "/categories",
    label: "카테고리",
    icon: "grid",
    match: (path: string) => path.startsWith("/categor") || path.startsWith("/brands"),
  },
  {
    href: "/search",
    label: "탐색",
    icon: "search",
    match: (path: string) => path.startsWith("/search") || path.startsWith("/products"),
  },
  { href: "/saved", label: "저장", icon: "bookmark", match: (path: string) => path.startsWith("/saved") },
] as const;

/** 디자인 C01·C02. 활성 탭은 경로에서 정한다. */
export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴" className="sticky bottom-0 border-t border-border bg-background">
      <ul className="flex px-2 pt-2 pb-3.5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center gap-1 py-1 text-[11px]",
                  active ? "font-bold text-brand" : "font-medium text-text-secondary",
                ].join(" ")}
              >
                <Icon name={tab.icon} size={20} filled={active} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
