import Link from "next/link";

type CategoryTrackItem = {
  readonly id: number;
  readonly name: string;
};

/**
 * 디자인의 가로 카테고리 선택 행.
 * 같은 대분류에 속한 소분류를 옆으로 늘어놓고 지금 보는 것만 강조한다.
 */
export function CategoryTrack({
  items,
  selectedId,
}: {
  readonly items: readonly CategoryTrackItem[];
  readonly selectedId: number;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="같은 분류의 카테고리" className="-mx-4 overflow-x-auto px-4 py-2">
      <ul className="flex gap-2">
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={`/categories/${item.id}`}
                aria-current={selected ? "page" : undefined}
                className={`flex h-10 items-center rounded-xl px-3.5 text-[13px] ${
                  selected
                    ? "border border-[#F5CBD4] bg-[#FFF0F4] font-bold text-[#E83D61]"
                    : "bg-[#F2F3F5] font-semibold text-[#54575C]"
                }`}
              >
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
