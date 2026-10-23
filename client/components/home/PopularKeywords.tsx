"use client";

import type { RankingItem } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useEffect, useId, useRef, useState } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { track } from "@/lib/analytics/track";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

/** 검색 결과 화면으로 바로 보낸다. 조건을 고르는 화면을 거치지 않는다. */
const searchHref = (keyword: string) => `/products?keyword=${encodeURIComponent(keyword)}`;

/**
 * 접힌 바가 다음 순위로 넘어가는 간격. 올라오는 데 420ms 를 쓰므로 한 줄이 멈춰 선 시간은 3초 남짓이다.
 * 한 줄을 읽기에는 넉넉하고, 다음 순위를 보려고 기다리는 느낌은 들지 않는다.
 */
const ROTATE_INTERVAL = 3500;

/** 마우스를 얹고 이만큼 머물러야 목록이 열린다. 지나가다 스치는 것으로는 열리지 않는다. */
const HOVER_DELAY = 200;

/** 순위 글자를 브랜드 색으로 칠하는 위쪽 순위 수(명세 S20a). 그 아래는 보조 글자색이다. */
const HIGHLIGHT_RANK = 3;

/**
 * 순위가 지난 집계에서 얼마나 움직였는지 알린다. 명세에는 없지만 계속 보여 주기로 했다(10/22 결정).
 *
 * 서버는 모든 항목에 `change` 를 내려보낸다. 비교할 이전 집계가 없는 항목도 `SAME` 과 0 으로 내려오므로 가로줄을 둔다.
 * 오름은 빨강, 내림은 파랑이다. 실시간 순위에서 널리 쓰는 짝이라 뜻을 따로 익히지 않아도 된다.
 * 목록 행에서는 기호마다 폭이 달라도 줄이 맞도록 칸의 최소 폭을 36 으로 두고 오른쪽에 붙인다(column). 글자를 키우면 칸이
 * 따라 넓어진다. 닫힌 바에서는 검색어 바로 옆에 붙인다(inline).
 * 기호는 낭독기에서 감추고, 뜻은 changeLabel 이 말로 알린다.
 */
function RankChange({
  change,
  placement,
}: {
  readonly change: RankingItem["change"];
  readonly placement: "column" | "inline";
}) {
  const movement = change?.movement;
  if (!movement) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center self-center text-label leading-none font-bold tabular-nums",
        placement === "column" && "min-w-9 justify-end",
      )}
    >
      {movement === "UP" ? (
        <span className="flex items-center gap-0.5 text-danger-action">
          <Icon name="trending-up" size={12} scalable />
          {change.steps}
        </span>
      ) : movement === "DOWN" ? (
        <span className="flex items-center gap-0.5 text-info-text">
          <Icon name="trending-down" size={12} scalable />
          {change.steps}
        </span>
      ) : movement === "NEW" ? (
        <span className="text-brand-text">NEW</span>
      ) : (
        <span className="text-text-muted">−</span>
      )}
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
   * 홈은 닫힌 바로 시작한다(overlay). 마우스를 얹으면 열리고, 펼친 목록은 아래 영역 위에 떠서 덮는다.
   * 커서로 여닫을 때 목록이 자리를 차지하면 손이 지날 때마다 아래가 밀렸다 돌아오기 때문이다. 명세 S20a 는 밀어내지만
   * 예전 동작을 지키기로 했다(10/22 결정).
   * 검색 화면은 처음부터 펼쳐 둔다(panel). 목록이 자리를 차지해 아래 영역을 밀어내고, 바를 눌러야만 접고 편다.
   */
  readonly variant?: "overlay" | "panel";
};

/**
 * 인기 검색어(명세 APP · 인기 검색어 · 닫힘 DYUNc / 열림 iXioM, 행 kv3L4).
 *
 * 닫힌 바 전체가 펼치기 버튼이다. 라벨 칩 · 1위 검색어와 순위 변동 · '실시간' · 화살표를 한 줄에 둔다. 펼치면 같은 상자 안에
 * 10개 행이 이어 붙는다. 행 끝에는 순위 변동을 둔다. 행을 누르면 그 검색어의 상품 목록으로 간다.
 *
 * 닫힌 바는 3.5초마다 다음 순위로 넘어간다. 다이얼이 구르듯 지나가는 검색어는 옅어지고 다음 검색어가 아래에서 올라온다.
 * 명세(MOTION M03)는 장식 반복을 두지 않지만 예전 동작을 지키기로 했다(10/22 결정). 펼쳐 두거나 동작 줄이기에서는 돌리지 않는다.
 * 화살표는 펼칠 때 180° 돌고, 목록은 바로 보이고 숨는다(M02 펼치기 · 접기).
 */
export function PopularKeywords({ items, variant = "overlay" }: PopularKeywordsProps) {
  const overlay = variant === "overlay";
  const [expanded, setExpanded] = useState(!overlay);
  // 자리는 계속 늘어나고 보여 줄 때만 길이로 나눈다. 처음으로 되돌아갈 때 거꾸로 구르지 않는다.
  const [index, setIndex] = useState(0);
  const listId = useId();
  const sectionRef = useHomeSectionView("popular_keywords", 2);
  const { pressableProps } = usePressable();
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // 펼쳐 두면 전체가 이미 보이고, 동작 줄이기에서는 저절로 바뀌는 글자를 두지 않는다.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (expanded || items.length <= 1 || reduced) return;
    const timer = setInterval(() => setIndex((current) => current + 1), ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [expanded, items.length]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  if (items.length === 0) return null;

  const current = items[index % items.length];
  // 처음 그릴 때는 지나간 검색어가 없다. 첫 검색어는 아래에서 올라오지 않고 제자리에 선다.
  const previous = index === 0 ? undefined : items[(index - 1) % items.length];

  const open = () => {
    if (expanded) return;
    track("popular_keywords_expanded", { rank: current.rank });
    setExpanded(true);
  };
  const toggle = () => (expanded ? setExpanded(false) : open());

  /* 마우스만 얹어 열고 떼어 닫는다. 손가락은 누름으로 여닫아, 누른 뒤 들어온 enter 가 다시 열지 않게 한다. */
  const hover = overlay
    ? {
        onPointerEnter: (event: React.PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(open, HOVER_DELAY);
        },
        onPointerLeave: (event: React.PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          clearTimeout(hoverTimer.current);
          setExpanded(false);
        },
      }
    : undefined;

  return (
    /* 띄운 목록이 아래 영역 위에 얹히도록 펼친 동안 쌓임 순서를 올린다. 패널은 덮을 것이 없어 필요 없다. */
    <section
      ref={sectionRef}
      aria-label="인기 검색어"
      {...hover}
      className={cn(
        "relative rounded-lg border border-border bg-background",
        overlay ? expanded && "z-(--z-popover) rounded-b-none" : "overflow-hidden",
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        {...pressableProps}
        onClick={toggle}
        /* 포커스 링은 상자의 overflow-hidden 에 잘리지 않게 안쪽으로 그린다. */
        className={cn(
          "pressable fb-surface flex min-h-13 w-full flex-wrap items-center gap-x-2 gap-y-1 bg-background px-4 py-2.5 text-left select-none focus-visible:-outline-offset-2",
          overlay && (expanded ? "rounded-t-lg" : "rounded-lg"),
          expanded && "border-b border-border",
        )}
      >
        {/*
          라벨 칩은 닫힘 30 · md, 열림 28 · sm 이다(명세). 머리 높이(52)는 같아 펼쳐도 아래가 흔들리지 않는다.
        */}
        <span
          className={cn(
            "flex shrink-0 items-center bg-brand-soft px-2 text-caption font-semibold whitespace-nowrap text-brand-text",
            expanded ? "min-h-7 rounded-sm" : "min-h-7.5 rounded-md",
          )}
        >
          인기 검색어
        </span>

        {/* 글자를 키워 한 줄에 다 들어가지 않으면 이 묶음이 다음 줄로 넘어간다. 라벨 칩만 홀로 남지 않는다. */}
        <span className="flex min-w-0 flex-1 basis-44 items-center gap-2">
          {expanded ? (
            <span className="min-w-0 flex-1 text-body-sm font-semibold text-text-body">전체 순위 {items.length}개</span>
          ) : (
            /*
              14 한글은 글꼴 여백 때문에 잉크가 줄 상자보다 1 위에 찍혀, 12 인 라벨 칩 · '실시간'보다 떠 보인다.
              위 2 를 더해 가운데 맞춤인 묶음을 1 내린다.
            */
            /*
              지나가는 검색어와 다음 검색어를 같은 칸에 겹쳐 자리를 밀지 않는다. 칸 밖으로 나간 글자는 잘라 창처럼 보인다.
              자리마다 새 key 를 주어 애니메이션이 매번 처음부터 돈다. 지나가는 쪽은 낭독기에서 감춘다.
            */
            <span className="grid min-w-0 flex-1 overflow-hidden pt-0.5">
              {previous ? (
                <span
                  key={`gone-${index}`}
                  aria-hidden="true"
                  className="popular-keyword-fade col-start-1 row-start-1 flex min-w-0 items-baseline gap-2"
                >
                  <TickerLine item={previous} />
                </span>
              ) : null}
              <span
                key={index}
                className={cn(
                  "col-start-1 row-start-1 flex min-w-0 items-baseline gap-2",
                  index > 0 && "popular-keyword-rise",
                )}
              >
                <TickerLine item={current} />
                <span className="sr-only">{changeLabel(current.change)}</span>
              </span>
            </span>
          )}

          <span className="flex shrink-0 items-center gap-1">
            <span className="text-caption font-medium whitespace-nowrap text-text-muted">실시간</span>
            <span
              aria-hidden="true"
              className={cn(
                "flex text-text-secondary transition-transform duration-(--duration-fast) ease-(--ease-out) motion-reduce:transition-none",
                expanded && "rotate-180",
              )}
            >
              <Icon name="chevron-down" size={16} />
            </span>
          </span>
        </span>
      </button>

      <ol
        id={listId}
        hidden={!expanded}
        className={cn(
          "flex flex-col bg-background",
          // 띄운 목록은 바 바로 아래에 붙여 같은 상자로 이어 보이게 하고, 아래 영역 위에 그림자를 둔다.
          overlay &&
            "absolute -inset-x-px top-full overflow-hidden rounded-b-lg border border-t-0 border-border shadow-(--shadow-raised)",
        )}
      >
        {items.map((item) => (
          <li key={item.keyword} className="border-b border-border last:border-b-0">
            <KeywordRow item={item} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 닫힌 바의 한 줄. 순위 · 검색어 · 순위 변동이다. */
function TickerLine({ item }: { readonly item: RankingItem }) {
  return (
    <>
      <span className="shrink-0 text-body leading-snug font-bold text-brand-text tabular-nums">{item.rank}</span>
      <span className="truncate text-body leading-snug font-semibold text-text-primary">{item.keyword}</span>
      <RankChange change={item.change} placement="inline" />
    </>
  );
}

function KeywordRow({ item }: { readonly item: RankingItem }) {
  const { pressableProps } = usePressable({ delayMs: 80 });

  return (
    <Link
      entryPoint="popular_keyword"
      href={searchHref(item.keyword)}
      {...pressableProps}
      onClick={() => track("popular_keyword_used", { keyword: item.keyword, rank: item.rank, placement: "expanded" })}
      className="pressable fb-surface flex min-h-10 items-baseline gap-2 px-4 py-2 select-none focus-visible:-outline-offset-2"
    >
      {/*
        순위 칸은 두 자리 숫자가 들어가는 18(명세 kv3L4)을 최소 폭으로 두어 검색어가 시작하는 자리를 맞춘다. 고정폭 숫자를 쓰고,
        글자를 키워 숫자가 넓어지면 칸이 따라 넓어져 두 줄로 갈라지지 않는다. 순위와 검색어는 글자의 기준선을 맞춘다.
      */}
      <span
        className={cn(
          "min-w-4.5 shrink-0 text-center text-body-sm leading-snug font-bold tabular-nums",
          item.rank <= HIGHLIGHT_RANK ? "text-brand-text" : "text-text-secondary",
        )}
      >
        {item.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-text-primary">{item.keyword}</span>
      <span className="sr-only">{changeLabel(item.change)}</span>
      <RankChange change={item.change} placement="column" />
    </Link>
  );
}
