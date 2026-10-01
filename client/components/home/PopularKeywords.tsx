"use client";

import type { RankingItem } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { track } from "@/lib/analytics/track";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

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
const searchHref = (keyword: string) => `/products?keyword=${encodeURIComponent(keyword)}&from=popular_keyword`;

/**
 * 순위가 지난 집계에서 얼마나 움직였는지 알린다.
 *
 * 서버는 모든 항목에 `change` 를 내려보낸다. 비교할 이전 집계가 없거나 기본 검색어로
 * 채운 항목도 `SAME` 과 0 으로 내려오므로 가로줄과 "변동 없음" 안내를 표시한다.
 * 기호마다 폭이 달라도 검색어가 시작하는 자리는 같도록 순위 변동 칸의 폭을 고정한다.
 */
/** 오름·내림 아이콘의 크기. 글자 크기(11px)에서 13×8px 이다. */
const TREND_ICON = "h-[calc(8em/11)] w-[calc(13em/11)]";

function RankChange({ change }: { readonly change: RankingItem["change"] }) {
  const movement = change?.movement;

  /* 오름은 빨강, 내림은 파랑. 실시간 순위에서 널리 쓰는 짝이라 뜻을 따로 익히지 않아도 된다. */
  const mark =
    movement === "UP" ? (
      <span className="flex items-center gap-[max(4px,calc(4em/11))] text-[#e5484d]">
        {/*
          높이를 계단 수의 글자 높이에 맞춘다. 글자 크기(11px)는 줄 높이라 실제 숫자가
          차지하는 높이는 8px 남짓인데, 아이콘은 지정한 높이를 꽉 채운다. 11 로 두면
          아이콘만 한 눈금 커 보인다. 폭은 그림 비율(20.5:12.5)을 따른다.

          선이 가늘면 이 크기에서 흐려지므로 굵기로 무게를 맞춘다.

          크기와 간격은 글자 크기(11px)를 기준으로 `em` 으로도 준다. 기기의 글자 크기
          설정이 계단 수를 키우면 아이콘도 같은 비율로 커진다. CSS 크기가 SVG 의 크기
          속성보다 우선하므로, 기본 크기에서는 13×8 그대로 그려진다. 간격은 `calc(4em/11)`
          만 두면 반올림으로 4px 에 조금 못 미쳐 글자가 옮겨 가므로 4px 을 아래 한계로 둔다.
        */}
        <Icon name="trending-up" width={13} height={8} preserveRatio strokeWidth={2.5} className={TREND_ICON} />
        {change?.steps}
      </span>
    ) : movement === "DOWN" ? (
      <span className="flex items-center gap-[max(4px,calc(4em/11))] text-[#3b82f6]">
        <Icon name="trending-down" width={13} height={8} preserveRatio strokeWidth={2.5} className={TREND_ICON} />
        {change?.steps}
      </span>
    ) : movement === "NEW" ? (
      <span className="text-brand">NEW</span>
    ) : movement === "SAME" ? (
      <span className="text-text-secondary">−</span>
    ) : null;

  /*
   * 폭은 글자 크기에 맞춰 늘어나도록 `em` 으로 잡는다(11px 에서 꼭 36px). 기기의 글자 크기
   * 설정은 글자만 키우고 px 폭은 그대로 두므로, px 로 두면 `NEW` 가 칸 밖으로 넘친다.
   */
  return (
    <span
      aria-hidden="true"
      className="flex w-[calc(36em/11)] shrink-0 items-center justify-center text-[11px] font-bold tabular-nums"
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

/**
 * 인기 검색어가 화면에서 자리를 잡는 두 가지 방식.
 *
 * `overlay` 는 지나가는 길에 두는 것이다. 한 줄만 접어 두었다가 손이 닿으면 열리고,
 * 열린 목록은 아래 영역 위에 떠서 덮는다. 자리를 차지하게 두면 그때마다 아래가 밀려
 * 화면이 통째로 흔들린다.
 *
 * `panel` 은 인기 검색어를 보러 온 화면에 두는 것이다. 처음부터 펼쳐 두고, 목록이
 * 자리를 차지해 아래 영역을 밀어낸다. 띄운 채로 열어 두면 첫 화면부터 아래를 덮는다.
 *
 * 두 방식은 목록이 자리를 차지하는지에서 갈리고, 나머지는 거기서 따라온다. 자리를
 * 차지하면 덮을 것이 없어 그림자와 쌓임 순서가 필요 없고, 커서로 여닫으면 손이 지날
 * 때마다 아래가 밀렸다 돌아오므로 단추로만 접고 편다.
 */
type PopularKeywordsVariant = "overlay" | "panel";

type PopularKeywordsProps = {
  readonly items: readonly RankingItem[];
  readonly variant?: PopularKeywordsVariant;
};

/**
 * 디자인 S01·S01a 의 인기 검색어.
 *
 * 접으면 한 줄만 보이고 일정 시간마다 다음 순위로 넘어간다. 넘어갈 때는 다이얼이
 * 구르듯 위로 밀려 올라가고 다음 줄이 아래에서 올라온다.
 *
 * 화면에 자리를 잡는 방식은 `PopularKeywordsVariant` 에 적어 두었다.
 */
export function PopularKeywords({ items, variant = "overlay" }: PopularKeywordsProps) {
  const panel = variant === "panel";
  const [expanded, setExpanded] = useState(panel);
  const [index, setIndex] = useState(0);
  const listId = useId();
  const sectionRef = useHomeSectionView("popular_keywords", 2);
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
   * 손을 얹어 열고 떼어 닫는 것은 `overlay` 의 방식이다. `panel` 은 목록이 자리를
   * 차지해, 손이 지나갈 때마다 아래 영역이 밀렸다 돌아온다. 접고 펴는 일을 단추에만
   * 맡기고, 커서는 아무것도 건드리지 않는다.
   */
  const hover = panel
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
     * 쌓임 순서를 올린다. `panel` 은 덮을 것이 없어 둘 다 필요 없다.
     */
    <section ref={sectionRef} className={panel ? undefined : `relative ${expanded ? "z-10" : ""}`} {...hover}>
      {/*
        기기의 글자 크기 설정을 키워도 겹치지 않도록 높이는 최소값만 두고, 한 줄에 다
        들어가지 않으면 다음 줄로 넘긴다. 기본 크기에서는 한 줄에 들어간다.
      */}
      <div
        className={`@container flex min-h-12.5 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-border bg-background px-3.5 py-1.5 ${
          expanded ? "rounded-b-none border-b-transparent" : ""
        }`}
      >
        <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-2 py-1 text-[12px] font-semibold text-brand">
          인기 검색어
        </span>

        {/*
          검색어 자리와 단추는 한 틀에 묶어 줄이 넘어갈 때 함께 넘어가게 한다. 따로 두면
          앞에서부터 채워지는 순서 때문에 검색어가 들어간 뒤 단추만 홀로 다음 줄로 떨어진다.
          이 틀이 줄어들 수 있는 가장 작은 폭은 안쪽 최소 폭의 합이라, 그만큼 남지 않으면
          통째로 넘어간다.
        */}
        <div className="flex flex-1 items-center gap-2.5">
          {expanded ? (
            /*
              최소 폭은 글자가 한 줄에 다 들어가는 만큼이다. 그만큼이 남지 않으면 단추와 함께
              다음 줄로 넘어간다. 최소 폭을 두지 않으면 단추만 홀로 다음 줄로 떨어진다.
            */
            <span className="min-w-[6.5em] flex-1 text-[14px] font-semibold text-text-primary">
              전체 순위 {items.length}개
            </span>
          ) : (
            /*
              창 하나를 뚫어 두고 그 안에서만 글자가 오간다. 창의 높이와 최소 폭은 순위 글자
              (16px)를 기준으로 `em` 으로 잡아, 글자가 커지면 창도 함께 커진다. 최소 폭이
              남지 않으면 창이 단추와 함께 다음 줄로 넘어가 한 줄을 모두 쓴다. 검색어가 한두 글자로
              줄거나 단추만 홀로 떨어지지 않는다. 최소 폭(112px)은 가장 좁은 화면(320px)의 기본
              크기에서 "실시간" 을 감추면 한 줄에 들어가는 만큼이다. 폭을 0 으로 두어, 줄을
            나눌 때 검색어 글자의 길이가 아니라 이 최소 폭만 따지게 한다.
            */
            <span className="relative h-[1.5em] w-0 min-w-[7em] flex-1 overflow-hidden text-[16px]">
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
                  className="popular-keyword-fade absolute inset-0 flex items-center gap-2.5"
                >
                  <span className="flex min-w-0 items-baseline gap-2.5">
                    <span className="text-[16px] font-bold text-brand">{previous.rank}</span>
                    <span className="truncate text-[14px] font-semibold text-text-primary">{previous.keyword}</span>
                  </span>
                  <RankChange change={previous.change} />
                </span>
              ) : null}

              <Link
                key={index}
                href={searchHref(current.keyword)}
                onClick={() =>
                  track("popular_keyword_used", { keyword: current.keyword, rank: current.rank, placement: "ticker" })
                }
                className={`relative flex h-full items-center gap-2.5 ${index === 0 ? "" : "popular-keyword-rise"}`}
              >
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <span className="text-[16px] font-bold text-brand">{current.rank}</span>
                  <span className="truncate text-[14px] font-semibold text-text-primary">{current.keyword}</span>
                </span>
                <RankChange change={current.change} />
                <span className="sr-only">{changeLabel(current.change)}</span>
              </Link>
            </span>
          )}

          {/*
            "실시간" 과 단추는 묶어 오른쪽 끝에 붙인다.

            "실시간" 은 자리가 모자라면 가장 먼저 내려놓는다. 이 글자 때문에 바가 두 줄로
            넘어가는 것보다 낫다. 검색어 창이 최소 폭(7em)보다 좁아질 폭이면 감춘다. 기준 폭은 글자를 따라 커지는 몫(em)과 여백·단추처럼 고정된 몫(px)을
            나눠 잡아, 기기의 글자 크기 설정을 키워도 같은 자리에서 감춰진다. 기본 크기에서는
            360px 이상의 화면에서 보이고, 320px 화면에서는 감춰진다.
          */}
          <span className="-mr-1.5 ml-auto flex shrink-0 items-center gap-2.5">
            <span className="whitespace-nowrap text-[12px] font-medium text-text-secondary @max-[calc(76px_+_12.75em)]:hidden">
              실시간
            </span>

            <button
              type="button"
              onClick={() => (expanded ? setExpanded(false) : open())}
              aria-expanded={expanded}
              aria-controls={listId}
              aria-label={expanded ? "인기 검색어 접기" : "인기 검색어 전체 보기"}
              className="popular-keyword-toggle relative flex size-9 shrink-0 items-center justify-center"
            >
              <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} className="text-text-secondary" />
            </button>
          </span>
        </div>
      </div>

      {/*
        목록은 바에 이어 붙인다. `overlay` 는 띄워 두어 자리를 차지하지 않으므로 아래
        영역이 밀리지 않고, 그림자로 아래 목록과 떨어뜨려 놓는다. `panel` 은 아래를
        밀어내고 제 자리를 잡으므로 덮을 것이 없다. 떠 있지 않은 것에 그림자를 드리우면
        그 자리만 들려 보인다.
      */}
      {expanded ? (
        <ol
          id={listId}
          className={`flex flex-col rounded-b-xl border border-t-0 border-border bg-background pb-1.5 ${
            panel ? "" : "absolute inset-x-0 top-full z-10 shadow-lg"
          }`}
        >
          {items.map((item) => (
            <li key={item.keyword}>
              <Link
                href={searchHref(item.keyword)}
                onClick={() =>
                  track("popular_keyword_used", { keyword: item.keyword, rank: item.rank, placement: "expanded" })
                }
                className="popular-keyword-row flex min-h-10 items-center gap-2.5 px-3.5 motion-reduce:transition-none"
              >
                {/*
                  순위와 검색어는 가운데가 아니라 글자의 기준선을 맞춘다. 한글이 기기 글꼴로
                  대신 그려지면 숫자와 한글의 글꼴이 갈리는데, 글꼴마다 줄 상자의 위아래 여백이
                  달라 상자끼리 가운데를 맞추면 글자가 서로 어긋난다. 둘을 묶은 줄은 행의
                  가운데에 둔다.

                  순위 칸은 두 자리 숫자가 들어갈 폭으로 고정해 검색어가 시작하는 자리를 맞춘다.
                  폭을 px 로 두면 기기의 글꼴이나 글자 크기 설정에 따라 `10` 이 넘쳐 두 줄로
                  갈라진다. 숫자 너비(`ch`)로 재고 고정폭 숫자를 쓰면 글꼴이 바뀌어도 꼭 맞는다.
                  한 자리와 두 자리 순위가 섞이므로 칸 안에서는 가운데에 둔다.
                */}
                <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
                  <span className="w-[2ch] shrink-0 whitespace-nowrap text-center text-[14px] font-bold tabular-nums text-brand">
                    {item.rank}
                  </span>
                  <span className="flex-1 truncate text-[14px] font-medium text-text-primary">{item.keyword}</span>
                </span>
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
