import Link from "next/link";

const TABS = [
  { key: "category", label: "카테고리", href: "/categories" },
  { key: "brand", label: "브랜드", href: "/brands" },
] as const;

/** 디자인의 카테고리·브랜드 탐색 전환. 두 목록은 성격이 달라 라우트를 나눈다. */
export function DirectoryTabs({ current }: { readonly current: "category" | "brand" }) {
  return (
    <nav aria-label="탐색 방식" className="flex border-b border-border">
      {TABS.map((tab) => {
        const selected = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={[
              "flex-1 py-3 text-center text-[14px]",
              selected ? "border-b-2 border-text-primary font-bold text-text-primary" : "text-text-secondary",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
