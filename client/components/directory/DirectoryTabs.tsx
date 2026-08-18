import Link from "next/link";

const TABS = [
  { key: "category", label: "카테고리", href: "/categories" },
  { key: "brand", label: "브랜드", href: "/brands" },
] as const;

/**
 * 디자인의 카테고리·브랜드 탐색 전환.
 * 회색 바탕 위에서 고른 쪽만 흰 알약으로 떠오른다.
 */
export function DirectoryTabs({ current }: { readonly current: "category" | "brand" }) {
  return (
    <nav aria-label="탐색 방식" className="mx-4 my-2 flex h-11 gap-0.5 rounded-xl bg-[#F2F3F5] p-[3px]">
      {TABS.map((tab) => {
        const selected = tab.key === current;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`flex flex-1 items-center justify-center rounded-[9px] text-[13px] ${
              selected ? "bg-background font-bold text-[#E83D61]" : "font-medium text-[#72747A]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
