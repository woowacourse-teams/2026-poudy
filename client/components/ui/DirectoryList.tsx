"use client";

import Link from "next/link";
import { Fragment } from "react";

import { BrandLogo } from "./BrandLogo";
import { Icon } from "./icons/Icon";

import { PRESS_SURFACE } from "@/components/ui/press";

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
  readonly imageUrl?: string | null;
  readonly href: string;
};

type DirectorySection = {
  /** 묶음 머리글. 브랜드 `전체` 에서 자음을 적는다. 없으면 머리글 없이 행만 둔다. */
  readonly heading?: string;
  readonly rows: readonly DirectoryRowItem[];
};

type DirectoryPanel = {
  /** 이 목록을 여는 레일 항목. */
  readonly railId: string;
  /** 화면에는 보이지 않는다. 레일이 이미 무엇을 골랐는지 보여 주므로 보조 기술에만 알린다. */
  readonly title: string;
  readonly description?: string;
  readonly sections: readonly DirectorySection[];
};

type DirectoryListProps = {
  /** 왼쪽 색인 레일. 카테고리는 대분류, 브랜드는 초성이 들어간다. */
  readonly rail: readonly DirectoryRailItem[];
  readonly selectedRailId: string;
  readonly onSelectRail: (id: string) => void;
  /**
   * 레일 항목별 목록. 고르지 않은 목록도 그려 두고 보이기만 감춘다.
   * 누를 때 만들어지는 목록은 검색 로봇이 받는 첫 HTML 에 링크가 남지 않는다.
   */
  readonly panels: readonly DirectoryPanel[];
  readonly railLabel: string;
  readonly onSelectRow?: (row: DirectoryRowItem) => void;
};

/**
 * S27(카테고리)과 S29(브랜드)가 함께 쓰는 2 단 디렉터리.
 * 왼쪽 회색 레일과 오른쪽 목록 패널로 나뉜다.
 *
 * 레일과 목록은 화면 전체가 아니라 각자 따로 스크롤된다. 목록을 한참 내려도 레일이 그대로 남아
 * 다른 대분류로 바로 옮겨 갈 수 있다. 높이는 화면에서 상단바(56px)·탭(44px)·하단 내비를 뺀 만큼이다.
 * 끝에 닿은 스크롤이 화면 전체로 번지지 않게 막는다.
 *
 * 기기 글자 크기를 키우면 레일과 목록 행이 함께 넓어져 두 단이 들어가지 않는다. 두 단에 필요한 폭은
 * 레일(116em/14)과 목록 행(여백 52px, 로고·화살표·이름 9.2em)을 더한 값이다. 그보다 좁으면
 * 레일을 목록 위의 가로 줄로 옮겨, 목록이 화면 폭을 모두 쓰게 한다.
 */
export function DirectoryList({
  rail,
  selectedRailId,
  onSelectRail,
  panels,
  railLabel,
  onSelectRow,
}: DirectoryListProps) {
  return (
    <div className="@container h-[calc(100dvh-3.5rem-2.75rem-var(--bottom-navigation-height))] min-h-80 text-[14px]">
      <div className="flex h-full flex-col overflow-hidden @min-[calc(52px_+_17.5em)]:flex-row">
        <nav
          aria-label={railLabel}
          className="scrollbar-none shrink-0 overflow-x-auto overscroll-contain bg-[#EFF1F5] @min-[calc(52px_+_17.5em)]:w-[calc(116em/14)] @min-[calc(52px_+_17.5em)]:overflow-x-hidden @min-[calc(52px_+_17.5em)]:overflow-y-auto"
        >
          <ul className="flex @min-[calc(52px_+_17.5em)]:block">
            {rail.map((item) => {
              const selected = item.id === selectedRailId;

              return (
                <li key={item.id}>
                  {/*
                  고른 칸만 흰 바탕이라 오른쪽 흰 목록과 이어져 보인다. 위 탭의 밑줄과 겹치지 않게
                  선이나 막대로는 표시하지 않는다. 누르는 동안과 마우스를 올린 동안에는 회색 레일보다
                  한 단계 짙게 칠한다. 고르고 풀리는 순간에는 글자 크기도 바로 바뀌므로, 바탕색만 천천히
                  바뀌면 둘이 따로 논다. 레일은 전환 없이 바로 칠한다.
                */}
                  <button
                    type="button"
                    onClick={() => onSelectRail(item.id)}
                    aria-current={selected ? "true" : undefined}
                    className={`flex min-h-[52px] items-center px-4 py-2 text-left whitespace-nowrap break-keep @min-[calc(52px_+_17.5em)]:w-full @min-[calc(52px_+_17.5em)]:whitespace-normal ${
                      selected
                        ? "bg-white text-[15px] font-bold text-[#182132]"
                        : "text-[14px] font-medium text-[#566273] active:bg-[#DEE2E9] pointer-fine:hover:bg-[#DEE2E9]"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {panels.map(({ railId, title, description, sections }) => (
          <div
            key={railId}
            hidden={railId !== selectedRailId}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pt-1 pb-6"
          >
            <h2 className="sr-only">{title}</h2>
            {description ? <p className="sr-only">{description}</p> : null}

            {sections.map((section, index) => (
              <section key={section.heading ?? index}>
                {section.heading ? (
                  <h3 className="pt-4 pr-4 pb-2 pl-5 text-[13px] font-bold text-[#6A7588]">{section.heading}</h3>
                ) : null}
                <ul>
                  {section.rows.map((row) => (
                    <li key={row.id}>
                      <DirectoryRow item={row} onSelect={onSelectRow} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 빗금 뒤에 줄을 바꿀 수 있는 자리를 둔다. 글자는 그대로라 링크 이름과 검색에는 영향이 없다.
 * 폭 없는 공백을 넣으면 화면 읽기 프로그램과 링크 이름에 그 글자가 섞인다.
 */
const slashBreakable = (label: string) =>
  label.split("/").map((part, index) => (
    <Fragment key={index}>
      {index > 0 && (
        <>
          /<wbr />
        </>
      )}
      {part}
    </Fragment>
  ));

/** `이름 + 개수 + 화살표` 행. 카테고리 소분류와 브랜드 목록이 같은 모양을 쓴다. */
function DirectoryRow({
  item,
  onSelect,
}: {
  readonly item: DirectoryRowItem;
  readonly onSelect?: (row: DirectoryRowItem) => void;
}) {
  const { label, count, countPrefix, initial, imageUrl, href } = item;

  return (
    // 누름·hover 표시는 다른 목록 행과 같은 규칙을 쓴다.
    <Link
      href={href}
      onClick={() => onSelect?.(item)}
      className={`flex min-h-[52px] items-center gap-2 border-b border-[#DEE2E9] py-2 pr-4 pl-5 ${PRESS_SURFACE}`}
    >
      {/* 로고가 있으면 그림으로, 없으면 이름 첫 글자로 자리를 채운다. */}
      {imageUrl ? <BrandLogo name={label} imageUrl={imageUrl} size={28} scalable /> : null}

      {!imageUrl && initial ? (
        <span className="flex size-[max(28px,calc(28em/11))] shrink-0 items-center justify-center rounded-full bg-[#EFF1F5] text-[11px] font-bold text-[#566273]">
          {initial}
        </span>
      ) : null}

      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2">
        {/* `스킨/토너` 처럼 빗금으로 이은 이름은 빗금 뒤에서 줄을 바꿀 수 있게 한다. */}
        <span className="text-[15px] font-medium break-keep text-[#182132]">{slashBreakable(label)}</span>
        {count === undefined ? null : (
          <span className="text-[13px] whitespace-nowrap text-[#6A7588]">
            {countPrefix ? `${countPrefix} ` : ""}
            {count.toLocaleString("ko-KR")}개
          </span>
        )}
      </span>

      <Icon name="chevron-right" size={16} scalable className="shrink-0 text-[#6A7588]" />
    </Link>
  );
}
