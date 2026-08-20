"use client";

import Link from "next/link";

import { BrandLogo } from "./BrandLogo";
import { Icon } from "./icons/Icon";

type DirectoryRailItem = {
  readonly id: string;
  readonly label: string;
};

type DirectoryRowItem = {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
  /** 개수 앞에 붙이는 말. 브랜드는 `제품 48개` 처럼 적는다. */
  readonly countPrefix?: string;
  /** 이름 앞의 동그라미 글자. 브랜드 목록에서 쓴다. */
  readonly initial?: string;
  /** 브랜드 로고. 없으면 initial 을 대신 보여 준다. */
  readonly imageUrl?: string;
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
    <div className="flex flex-1 overflow-hidden rounded-xl bg-white">
      <nav aria-label={railLabel} className="w-[92px] shrink-0 border-r border-border bg-[#F5F6F7] px-1.5 py-2">
        <ul className="flex flex-col gap-1">
          {rail.map((item) => {
            const selected = item.id === selectedRailId;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectRail(item.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`flex h-11 w-full items-center rounded-[10px] px-3 text-left text-[13px] ${
                    selected ? "bg-[#FFF0F4] font-bold text-[#F04465]" : "font-medium text-[#72747A]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 pt-5">
        <div className="flex flex-col gap-1 px-4 pb-2">
          <h2 className="text-[17px] font-bold text-[#202124]">{title}</h2>
          {description ? <p className="text-[11px] text-[#72747A]">{description}</p> : null}
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
function DirectoryRow({ label, count, countPrefix, initial, imageUrl, href }: DirectoryRowItem) {
  return (
    <Link href={href} className="flex h-14 items-center gap-2.5 border-b border-[#ECEDEF] px-4">
      {/* 로고가 있으면 그림으로, 없으면 이름 첫 글자로 자리를 채운다. */}
      {imageUrl ? <BrandLogo name={label} imageUrl={imageUrl} size={32} /> : null}

      {!imageUrl && initial ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-text-secondary">
          {initial}
        </span>
      ) : null}

      <span className="flex flex-1 items-baseline gap-[7px]">
        <span className="text-[14px] font-semibold text-[#202124]">{label}</span>
        {count === undefined ? null : (
          <span className="text-[11px] text-[#8B8D94]">
            {countPrefix ? `${countPrefix} ` : ""}
            {count.toLocaleString("ko-KR")}개
          </span>
        )}
      </span>

      <Icon name="chevron-right" size={16} className="text-[#8B8D94]" />
    </Link>
  );
}
