"use client";

import Link from "next/link";

type DirectoryRailItem = {
  readonly id: string;
  readonly label: string;
};

type DirectoryRowItem = {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
  readonly href: string;
};

type DirectoryListProps = {
  /** 왼쪽 색인 레일. 카테고리는 대분류, 브랜드는 초성이 들어간다. */
  readonly rail: readonly DirectoryRailItem[];
  readonly selectedRailId: string;
  readonly onSelectRail: (id: string) => void;
  readonly title: string;
  readonly description?: string;
  readonly rows: readonly DirectoryRowItem[];
  readonly railLabel: string;
};

/**
 * S08(카테고리)과 S10(브랜드)이 함께 쓰는 2 단 디렉터리.
 * 왼쪽 색인 레일과 오른쪽 목록 패널로 나뉜다.
 */
export function DirectoryList({
  rail,
  selectedRailId,
  onSelectRail,
  title,
  description,
  rows,
  railLabel,
}: DirectoryListProps) {
  return (
    <div className="flex flex-1 bg-white">
      <nav aria-label={railLabel} className="w-[104px] shrink-0 bg-[#F5F6F7]">
        <ul>
          {rail.map((item) => {
            const selected = item.id === selectedRailId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectRail(item.id)}
                  aria-current={selected ? "true" : undefined}
                  className={[
                    "w-full px-4 py-3.5 text-left text-[14px]",
                    selected ? "bg-brand-soft font-semibold text-[#F04465]" : "text-text-secondary",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
          {description ? <p className="mt-1 text-[12px] text-text-secondary">{description}</p> : null}
        </div>

        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <DirectoryRow {...row} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** `이름 + 개수 + 화살표` 행. 카테고리 소분류와 브랜드 목록이 같은 모양을 쓴다. */
function DirectoryRow({ label, count, href }: DirectoryRowItem) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[14px] text-text-primary">{label}</span>
        {count === undefined ? null : (
          <span className="text-[12px] text-[#8B8D94]">{count.toLocaleString("ko-KR")}개</span>
        )}
      </span>
      <ChevronRight />
    </Link>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="#8B8D94" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
