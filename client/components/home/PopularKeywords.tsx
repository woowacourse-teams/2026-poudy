"use client";

import type { RankingItem } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { track } from "@/lib/analytics/track";

/**
 * 접힌 줄이 다음 순위로 넘어가는 간격. 올라오는 데 420ms 를 쓰므로 한 줄이 멈춰 선 시간은
 * 3초 남짓이다. 한 줄을 읽기에는 넉넉하고, 다음 순위를 보려고 기다리는 느낌은 들지 않는다.
 */
const ROTATE_INTERVAL = 3500;

/**
 * 손을 얹고 이만큼 머물러야 목록이 열린다. 지나가다 스치는 것으로는 열리지 않되,
 * 열 뜻으로 멈춘 손은 기다리지 않게 한다.
 */
const HOVER_DELAY = 200;

/** 검색 결과 화면으로 바로 보낸다. 조건을 고르는 화면을 거치지 않는다. */
const searchHref = (keyword: string) => `/products?keyword=${encodeURIComponent(keyword)}`;

/**
 * 순위가 지난 집계에서 얼마나 움직였는지 알린다.
 *
 * 서버는 견줄 지난 집계가 없으면 `change` 를 아예 빼고 내려보낸다(`RankingChange.isKnown`).
 * 그때는 아무것도 그리지 않는다. 자리를 비워 두면 줄마다 검색어가 시작하는 자리가 어긋나므로,
 * 폭은 고정해 두고 안쪽만 비운다.
 *
 * `SAME` 도 같은 자리를 차지한다. 변동이 없다는 것과 견줄 것이 없다는 것은 다른 뜻이라
 * 가로줄로 구분해 보여 준다.
 */
function RankChange({ change }: { readonly change: RankingItem["change"] }) {
  const movement = change?.movement;

  /* 오름은 빨강, 내림은 파랑. 실시간 순위에서 널리 쓰는 짝이라 뜻을 따로 익히지 않아도 된다. */
  const mark =
    movement === "UP" ? (
      <span className="flex items-center gap-1 text-[#e5484d]">
        {/*
          높이를 계단 수의 글자 높이에 맞춘다. 글자 크기(11px)는 줄 높이라 실제 숫자가
          차지하는 높이는 8px 남짓인데, 아이콘은 지정한 높이를 꽉 채운다. 11 로 두면
          아이콘만 한 눈금 커 보인다. 폭은 그림 비율(20.5:12.5)을 따른다.

          선이 가늘면 이 크기에서 흐려지므로 굵기로 무게를 맞춘다.
        */}
        <Icon name="trending-up" width={13} height={8} preserveRatio strokeWidth={2.5} />
        {change?.steps}
      </span>
    ) : movement === "DOWN" ? (
      <span className="flex items-center gap-1 text-[#3b82f6]">
        <Icon name="trending-down" width={13} height={8} preserveRatio strokeWidth={2.5} />
        {change?.steps}
      </span>
    ) : movement === "NEW" ? (
      <span className="text-brand">NEW</span>
    ) : movement === "SAME" ? (
      <span className="text-text-secondary">−</span>
    ) : null;

  return (
    <span
      aria-hidden="true"
      className="flex w-9 shrink-0 items-center justify-center text-[11px] font-bold tabular-nums"
    >
      {mark}
    </span>
  );
}

/** 낭독기에는 기호 대신 말로 알린다. 화살표와 가로줄은 읽어도 뜻이 전해지지 않는다. */
const changeLabel = (change: RankingItem["change"]): string => {
  if (change?.movement === "UP") return `, ${change.steps}계단 상승`;
  if (change?.movement === "DOWN") return `, ${change.steps}계단 하락`;
  if (change?.movement === "NEW") return ", 새로 진입";
  if (change?.movement === "SAME") return ", 변동 없음";
  return "";
};

type PopularKeywordsProps = {
  readonly items: readonly RankingItem[];
  /**
   * 펼친 채로 시작한다. 인기 검색어를 보러 온 화면에서는 손을 대야 순위가 나오는 것이
   * 한 번 더 묻는 일이 된다.
   */
  readonly defaultExpanded?: boolean;
  /**
   * 펼친 목록이 자리를 차지한다. 띄워 두면 바로 아래 영역을 가리므로, 처음부터 펼쳐 두는
   * 화면에서는 아래를 밀어내고 제 자리를 잡아야 한다.
   */
  readonly flowWhenExpanded?: boolean;
};

/**
 * 디자인 S01·S01a 의 인기 검색어.
 *
 * 접으면 한 줄만 보이고 일정 시간마다 다음 순위로 넘어간다. 넘어갈 때는 다이얼이
 * 구르듯 위로 밀려 올라가고 다음 줄이 아래에서 올라온다.
 *
 * 펼친 목록은 기본적으로 바 아래에 띄워 둔다. 자리를 차지하게 두면 아래 영역이 그만큼
 * 밀려 화면이 통째로 흔들린다. 홈이 그렇다. 펼친 채로 시작하는 화면은 반대로 자리를
 * 차지해야 한다. 띄워 둔 채로 열어 두면 첫 화면부터 아래를 덮고 있다.
 */
export function PopularKeywords({ items, defaultExpanded = false, flowWhenExpanded = false }: PopularKeywordsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [index, setIndex] = useState(0);
  const listId = useId();
  const reduced = useRef(false);
  /* 손을 얹은 채 머무는 시간을 잰다. 떼면 취소한다. */
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    // 펼쳐 두면 전체가 이미 보이므로 돌릴 이유가 없다.
    if (expanded || items.length <= 1 || reduced.current) return;

    const timer = setInterval(() => setIndex((current) => current + 1), ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [expanded, items.length]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  if (items.length === 0) return null;

  // 자리는 계속 늘어나고 보여 줄 때만 길이로 나눈다. 되돌아갈 때 거꾸로 가지 않는다.
  const current = items[index % items.length];
  /* 처음 그릴 때는 지나간 것이 없다. 첫 검색어가 아래에서 올라오지 않고 제자리에 선다. */
  const previous = index === 0 ? undefined : items[(index - 1) % items.length];

  const open = () => {
    if (expanded) return;
    setExpanded(true);
    track("popular_keywords_expanded", { rank: current.rank });
  };

  const holdToOpen = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(open, HOVER_DELAY);
  };

  const cancelHold = () => clearTimeout(hoverTimer.current);

  /*
   * 손을 얹어 열고 떼어 닫는 것은 띄워 두는 화면의 방식이다. 목록이 자리를 차지하는
   * 화면에서는 손이 지나갈 때마다 아래 영역이 밀렸다 돌아온다. 접고 펴는 일을 버튼에만
   * 맡기고, 커서는 아무것도 건드리지 않는다.
   */
  const hover = flowWhenExpanded
    ? undefined
    : {
        onMouseEnter: holdToOpen,
        onMouseLeave: () => {
          cancelHold();
          setExpanded(false);
        },
      };

  return (
    /*
     * 띄워 둔 목록은 이 자리를 기준으로 삼는다. 목록이 아래 영역 위에 얹히도록
     * 쌓임 순서를 올린다. 자리를 차지하는 목록은 덮을 것이 없어 둘 다 필요 없다.
     */
    <section className={flowWhenExpanded ? undefined : `relative ${expanded ? "z-10" : ""}`} {...hover}>
      <div
        className={`flex h-12.5 items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 ${
          expanded ? "rounded-b-none border-b-transparent" : ""
        }`}
      >
        <span className="shrink-0 rounded-full bg-brand-soft px-2 py-1 text-[12px] font-semibold text-brand">
          인기 검색어
        </span>

        {expanded ? (
          <span className="flex-1 text-[14px] font-semibold text-text-primary">전체 순위 {items.length}개</span>
        ) : (
          /* 창 하나를 뚫어 두고 그 안에서만 글자가 오간다. */
          <span className="relative h-6 min-w-0 flex-1 overflow-hidden">
            {/*
              지나가는 검색어는 제자리에서 옅어지고, 다음 검색어가 아래에서 올라온다.
              둘을 같은 자리에 겹쳐 두어 자리를 밀지 않는다. 지나가는 쪽은 자리만 차지하지
              않도록 띄워 두고, 낭독기에서도 감춘다.

              자리마다 새 `key` 를 주어 React 가 다시 그리므로 애니메이션이 매번 처음부터 돈다.
            */}
            {previous ? (
              <span
                key={`gone-${index}`}
                aria-hidden="true"
                className="popular-keyword-fade absolute inset-0 flex h-6 items-center gap-2.5"
              >
                <span className="text-[16px] font-bold text-brand">{previous.rank}</span>
                <span className="truncate text-[14px] font-semibold text-text-primary">{previous.keyword}</span>
                <RankChange change={previous.change} />
              </span>
            ) : null}

            <Link
              key={index}
              href={searchHref(current.keyword)}
              onClick={() => track("popular_keyword_used", { keyword: current.keyword, rank: current.rank })}
              className={`relative flex h-6 items-center gap-2.5 ${index === 0 ? "" : "popular-keyword-rise"}`}
            >
              <span className="text-[16px] font-bold text-brand">{current.rank}</span>
              <span className="truncate text-[14px] font-semibold text-text-primary">{current.keyword}</span>
              <RankChange change={current.change} />
              <span className="sr-only">{changeLabel(current.change)}</span>
            </Link>
          </span>
        )}

        <span className="shrink-0 text-[12px] font-medium text-text-secondary">실시간</span>

        <button
          type="button"
          onClick={() => (expanded ? setExpanded(false) : open())}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={expanded ? "인기 검색어 접기" : "인기 검색어 전체 보기"}
          className="popular-keyword-toggle relative -mr-1.5 flex size-9 shrink-0 items-center justify-center"
        >
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} className="text-text-secondary" />
        </button>
      </div>

      {/*
        목록은 바에 이어 붙인다. 띄워 두면 자리를 차지하지 않아 아래 영역이 밀리지 않고,
        그림자로 아래 목록과 떨어뜨려 놓는다. 흐름에 놓으면 아래를 밀어내고 제 자리를
        잡으므로 덮을 것이 없다. 떠 있지 않은 것에 그림자를 드리우면 그 자리만 들려 보인다.
      */}
      {expanded ? (
        <ol
          id={listId}
          className={`flex flex-col rounded-b-xl border border-t-0 border-border bg-background pb-1.5 ${
            flowWhenExpanded ? "" : "absolute inset-x-0 top-full z-10 shadow-lg"
          }`}
        >
          {items.map((item) => (
            <li key={item.keyword}>
              <Link
                href={searchHref(item.keyword)}
                onClick={() => track("popular_keyword_used", { keyword: item.keyword, rank: item.rank })}
                className="popular-keyword-row flex h-10 items-center gap-2.5 px-3.5 motion-reduce:transition-none"
              >
                <span className="w-4.5 shrink-0 text-[14px] font-bold text-brand">{item.rank}</span>
                <span className="flex-1 truncate text-[14px] font-medium text-text-primary">{item.keyword}</span>
                <RankChange change={item.change} />
                <span className="sr-only">{changeLabel(item.change)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
