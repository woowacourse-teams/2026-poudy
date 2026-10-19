"use client";

import { Icon } from "@poudy/design-system/icon";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { slashBreakable } from "@/components/ui/slash-breakable";
import { formatCount } from "@/lib/domain/format";

type DirectoryRailItem = {
  readonly id: string;
  readonly label: string;
};

export type DirectoryRowItem = {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
  /** 이름 앞의 로고 원. 브랜드 목록에서 쓴다. 그림이 없으면 이름 첫 글자를 대신 보여 준다. */
  readonly logo?: { readonly imageUrl: string | null };
  readonly href: string;
};

type DirectorySection = {
  /** 묶음 머리글. 브랜드 `전체` 에서 초성을 적는다. 없으면 머리글 없이 행만 둔다. */
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
   * 레일 항목별 목록. 고르지 않은 목록도 그려 두고 보이기만 감춘다. 방향키로 레일을 옮기면 기다리지 않고 바로 바뀌고
   * (A11Y D04 자동 전환), 검색 로봇이 받는 첫 HTML 에도 모든 링크가 남는다.
   */
  readonly panels: readonly DirectoryPanel[];
  readonly railLabel: string;
  readonly onSelectRow?: (row: DirectoryRowItem) => void;
};

/**
 * S27(카테고리)과 S29(브랜드)가 함께 쓰는 두 단 디렉터리. 왼쪽 회색 레일(Tabs rail)과 오른쪽 목록 패널로 나뉜다.
 *
 * 두 단에 필요한 폭(@min-[calc(52px_+_17.5em)])은 레일(가장 넓은 116em/14)과 목록 행(여백 52px, 로고·화살표·이름 9.2em)을
 * 더한 값이다. 기기 글자를 키워 이보다 좁아지면 레일을 목록 위의 가로 줄로 옮겨, 목록이 화면 폭을 모두 쓰게 한다.
 *
 * 레일과 목록은 화면 전체가 아니라 각자 따로 스크롤된다. 목록을 한참 내려도 레일이 그대로 남아 다른 대분류로 바로
 * 옮겨 갈 수 있다. 높이는 레이아웃이 상단 내비와 탭을 그리고 남은 만큼이다. 끝에 닿은 스크롤이 화면 전체로 번지지
 * 않게 막는다.
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
    <Tabs variant="rail" value={selectedRailId} onValueChange={onSelectRail}>
      <div className="@container directory-rail-width flex min-h-80 grow basis-0 flex-col text-body">
        <div className="flex min-h-0 grow basis-0 flex-col overflow-hidden @min-[calc(52px_+_17.5em)]:flex-row">
          {/*
           * 고른 칸만 흰 면이라 오른쪽 흰 목록과 이어져 보인다. 좁을 때는 가로 줄이라 칸 이름이 줄을 바꾸지 않는다.
           * 두 단일 때는 레일 폭(A11Y D08)에 맞춰 이름이 두 줄까지 내려간다. 390 보다 좁으면 레일이 104 · 96 으로 줄어
           * `베이스메이크업`처럼 띄어 쓴 곳이 없는 이름이 칸 밖으로 넘치므로, 넘칠 때만 낱말 안에서 줄을 바꾼다. 390 이상
           * (116)에서는 명세 그림처럼 한 줄로 두고 오른쪽 여백까지만 쓴다.
           */}
          <TabList
            label={railLabel}
            className="scrollbar-none shrink-0 flex-row overflow-x-auto overscroll-contain @min-[calc(52px_+_17.5em)]:w-(--directory-rail) @min-[calc(52px_+_17.5em)]:flex-col @min-[calc(52px_+_17.5em)]:overflow-x-hidden @min-[calc(52px_+_17.5em)]:overflow-y-auto"
          >
            {rail.map((item) => (
              <Tab key={item.id} value={item.id}>
                <span className="text-start whitespace-nowrap @min-[calc(52px_+_17.5em)]:whitespace-normal max-[390px]:wrap-anywhere">
                  <TabLabel>{item.label}</TabLabel>
                </span>
              </Tab>
            ))}
          </TabList>

          {panels.map(({ railId, title, description, sections }) => (
            <TabPanel
              key={railId}
              value={railId}
              keepMounted
              className="min-h-0 min-w-0 grow basis-0 overflow-y-auto overscroll-contain"
            >
              {/* 패널의 자리는 부품 밖에서 정하고, 아래 여백(24)은 안쪽 칸이 맡는다. 첫 행은 탭 바로 아래에 붙는다. */}
              <div className="pb-6">
                <h2 className="sr-only">{title}</h2>
                {description ? <p className="sr-only">{description}</p> : null}

                {sections.map((section, index) => (
                  <section key={section.heading ?? index}>
                    {section.heading ? (
                      <h3 className="pt-4 pr-4 pb-2 pl-5 text-body-sm leading-snug font-bold text-text-muted">
                        {section.heading}
                      </h3>
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
            </TabPanel>
          ))}
        </div>
      </div>
    </Tabs>
  );
}

/** `이름 + 개수 + 화살표` 행(명세 APP · 카테고리 소분류 행, APP · 브랜드 행). */
function DirectoryRow({
  item,
  onSelect,
}: {
  readonly item: DirectoryRowItem;
  readonly onSelect?: (row: DirectoryRowItem) => void;
}) {
  const { label, count, logo, href } = item;
  // 스크롤 목록의 행이라 눌림을 조금 늦게 켠다. 스크롤하려고 댄 손가락에 행이 깜박이지 않는다(STATE S09).
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    // 목록은 스크롤 칸이라 바깥으로 그린 포커스 링이 좌우에서 잘린다. 링을 행 안쪽에 그린다.
    <Link
      href={href}
      {...pressableProps}
      onClick={() => onSelect?.(item)}
      className="pressable fb-row flex min-h-13 items-center gap-2 border-b border-border py-2 pr-4 pl-5 focus-visible:-outline-offset-2"
    >
      {logo ? <BrandLogo name={label} imageUrl={logo.imageUrl} size={28} scalable /> : null}

      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2">
        {/* `스킨/토너` 처럼 빗금으로 이은 이름은 빗금 뒤에서 줄을 바꿀 수 있게 한다. */}
        <span className="text-title font-medium break-keep text-text-primary">{slashBreakable(label)}</span>
        {count === undefined ? null : (
          // 눌리면 행 면이 짙어지므로 수량 글자도 한 단계 올려 대비를 지킨다(fb-row, STATE S10).
          <span data-count="" className="text-body-sm leading-snug whitespace-nowrap text-text-muted">
            {formatCount(count)}
          </span>
        )}
      </span>

      <Icon name="chevron-right" size={16} scalable className="text-text-muted" />
    </Link>
  );
}
