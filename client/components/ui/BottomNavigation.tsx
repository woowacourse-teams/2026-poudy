"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈", match: (path: string) => path === "/" },
  {
    href: "/categories",
    label: "카테고리",
    match: (path: string) => path.startsWith("/categor") || path.startsWith("/brands"),
  },
  {
    href: "/search",
    label: "탐색",
    match: (path: string) => path.startsWith("/search") || path.startsWith("/products"),
  },
  { href: "/saved", label: "저장", match: (path: string) => path.startsWith("/saved") },
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
                <TabIcon name={tab.label} active={active} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabIcon({ name, active }: { readonly name: string; readonly active: boolean }) {
  const paths: Record<string, string> = {
    홈: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-4H7v4H4a1 1 0 0 1-1-1V9.5Z",
    카테고리: "M3 4h6v6H3V4Zm8 0h6v6h-6V4ZM3 12h6v4H3v-4Zm8 0h6v4h-6v-4Z",
    탐색: "M9 3a6 6 0 1 1 0 12A6 6 0 0 1 9 3Zm4.5 10.5L17 17",
    저장: "M5 3.5h10a1 1 0 0 1 1 1V17l-6-3.5L4 17V4.5a1 1 0 0 1 1-1Z",
  };

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill={active ? "currentColor" : "none"} aria-hidden="true">
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
