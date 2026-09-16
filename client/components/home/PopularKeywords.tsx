"use client";

import type { RankingItem } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { track } from "@/lib/analytics/track";

/** 접힌 줄이 다음 순위로 넘어가는 간격. 한 줄을 읽고 나서 넘어갈 만큼 둔다. */
const ROTATE_INTERVAL = 6000;

/** 손을 얹고 이만큼 머물러야 목록이 열린다. 지나가다 스치는 것으로는 열리지 않는다. */
const HOVER_DELAY = 500;

/** 검색 결과 화면으로 바로 보낸다. 조건을 고르는 화면을 거치지 않는다. */
const searchHref = (keyword: string) => `/products?keyword=${encodeURIComponent(keyword)}`;

/**
 * 디자인 S01·S01a 의 인기 검색어.
 *
 * 접으면 한 줄만 보이고 일정 시간마다 다음 순위로 넘어간다. 넘어갈 때는 다이얼이
 * 구르듯 위로 밀려 올라가고 다음 줄이 아래에서 올라온다.
 *
 * 펼친 목록은 바 아래에 띄워 둔다. 자리를 차지하게 두면 아래 영역이 그만큼 밀려
 * 화면이 통째로 흔들린다.
 */
export function PopularKeywords({ items }: { readonly items: readonly RankingItem[] }) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    /*
     * 펼친 목록을 띄워 두므로 이 자리가 기준이 된다. 목록이 아래 영역 위에 얹히도록
     * 쌓임 순서를 올린다.
     */
    <section
      className={`relative ${expanded ? "z-10" : ""}`}
      onMouseEnter={holdToOpen}
      onMouseLeave={() => {
        cancelHold();
        setExpanded(false);
      }}
    >
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
          className="-mr-1.5 flex size-9 shrink-0 items-center justify-center"
        >
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} className="text-text-secondary" />
        </button>
      </div>

      {/*
        목록은 바에 이어 붙여 아래로 띄운다. `absolute` 라 자리를 차지하지 않아
        아래 영역이 밀리지 않는다.
      */}
      {expanded ? (
        <ol
          id={listId}
          className="absolute inset-x-0 top-full z-10 flex flex-col rounded-b-xl border border-t-0 border-border bg-background pb-1.5 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.keyword}>
              <Link
                href={searchHref(item.keyword)}
                onClick={() => track("popular_keyword_used", { keyword: item.keyword, rank: item.rank })}
                className="popular-keyword-row flex h-10 items-center gap-2.5 px-3.5 motion-reduce:transition-none"
              >
                <span className="w-4.5 shrink-0 text-[14px] font-bold text-brand">{item.rank}</span>
                <span className="truncate text-[14px] font-medium text-text-primary">{item.keyword}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
