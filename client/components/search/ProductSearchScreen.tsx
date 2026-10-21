"use client";

import type { RelatedKeywordResponse } from "@poudy/api/api.zod";
import { Combobox, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { SearchField } from "@poudy/design-system/search-field";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { RecentSearches } from "./RecentSearches";
import { SearchModeTabs } from "./SearchModeTabs";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { MatchedText } from "@/components/ui/MatchedText";
import { track } from "@/lib/analytics/track";
import { recordSearchKeyword } from "@/lib/api/products";
import { formatCount, josaOf } from "@/lib/domain/format";
import { type HighlightPart, splitByRange } from "@/lib/domain/highlight";
import { useDeferredSubmit } from "@/lib/hooks/useDeferredSubmit";
import { useRelatedKeywords } from "@/lib/hooks/useRelatedKeywords";
import { addRecentFilter } from "@/lib/storage/recent-filters";
import { addRecentSearch } from "@/lib/storage/recent-searches";

const PLACEHOLDER = "브랜드 또는 제품명을 입력해 주세요";
const LABEL = "제품명 검색";

/** 연관검색어에서 맞은 자리를 토막 낸다. 범위가 글자 밖을 가리키면 강조 없이 글자만 둔다. */
const keywordParts = (item: RelatedKeywordResponse) => splitByRange({ text: item.keyword, ...item.match });

/**
 * 실제로 검색을 보낸 말만 인기 검색어 집계에 남긴다. 치는 도중의 값까지 세면 순위가 타이핑 조각으로 채워진다.
 * 집계는 부수적인 일이라 실패해도 검색을 막지 않는다.
 */
const recordKeyword = (keyword: string): void => {
  void recordSearchKeyword(keyword).catch(() => undefined);
};

/** 결과 목록을 열 때 남기는 기록. 홈의 최근 탐색 조건 카드와 이 화면의 최근 검색에 함께 쓴다. */
const rememberKeyword = (keyword: string) => {
  addRecentSearch({ kind: "keyword", keyword });
  recordKeyword(keyword);
  addRecentFilter({ query: `keyword=${encodeURIComponent(keyword)}`, summary: keyword, mode: "product" });
};

/** 연관검색어를 고르지 않고 입력한 검색어 그대로 결과 목록을 열 때. */
const submitKeyword = (keyword: string, total: number) => {
  track("search_submitted", { mode: "product", query: keyword, result_count: total });
  rememberKeyword(keyword);
};

const resultsPath = (keyword: string) => `/products?keyword=${encodeURIComponent(keyword)}`;

type ProductSearchScreenProps = {
  /** 검색어가 없을 때 최근 검색 아래에 두는 것(인기 검색어). 서버가 그려 넘긴다. */
  readonly children?: ReactNode;
};

const ignore = () => {};

/** 화면 머리. 탭과 검색 입력이다(명세 S21 '제품명 검색 Section'). */
function Header({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <SearchModeTabs current="product" />
      {children}
    </div>
  );
}

/**
 * 연관검색어 한 줄(명세 `APP · 연관검색어 행`). 행 전체가 동작이라 끝에 아이콘을 두지 않는다.
 * 맞은 자리는 굵기로만 가르고 색은 바꾸지 않는다. 한 줄을 넘으면 말줄임으로 자른다.
 */
function KeywordRow({ label, parts }: { readonly label: string; readonly parts: readonly HighlightPart[] }) {
  return (
    <span className="flex min-h-13 items-center gap-3 border-b border-border py-3">
      <span className="flex size-6 shrink-0 items-center justify-center text-text-secondary">
        <Icon name="search" size={20} />
      </span>
      <MatchedText
        label={label}
        parts={parts}
        plainClassName="min-w-0 flex-1 truncate text-title text-text-primary"
        dimmedClassName="min-w-0 flex-1 truncate text-title text-text-primary"
        matchedClassName="font-bold"
      />
    </span>
  );
}

/**
 * 검색어를 읽기 전의 S21. 검색어가 없을 때와 같은 모양이다. 검색어는 주소에서 읽어 브라우저에서만 알 수 있어,
 * 미리 만든 HTML 에는 이 모양이 담긴다. 최근 검색은 기기에만 있어 여기서는 그리지 않는다.
 */
export function ProductSearchScreenFallback({ children }: ProductSearchScreenProps) {
  return (
    <main className="flex flex-1 flex-col">
      <SubTopBar title="탐색 조건 설정" />
      <div className="flex flex-col px-gutter pt-3 pb-6">
        <Header>
          <SearchField value="" onChange={ignore} placeholder={PLACEHOLDER} label={LABEL} />
        </Header>
        {children}
      </div>
    </main>
  );
}

/** S21 · S21a 제품명 탭. 검색어는 주소의 `keyword` 에 남겨 상세에 다녀와도 이어진다. */
export function ProductSearchScreen({ children }: ProductSearchScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") ?? "");
  const { items, total, loading, keyword: searched } = useRelatedKeywords(keyword);

  /*
   * 검색어를 주소에 남긴다. 화면이 들고 있으면 상세로 나갔다 돌아왔을 때 사라진다.
   * `router.replace` 는 서버를 한 번 다녀오므로 history API 만 갈아 끼운다. 주소는 화면 밖 저장소라 effect 로 맞춘다.
   */
  useEffect(() => {
    const query = searched ? `?keyword=${encodeURIComponent(searched)}` : "";
    window.history.replaceState(null, "", `/search/products${query}`);
  }, [searched]);

  const trimmed = keyword.trim();
  const typing = trimmed.length > 0;
  const searching = loading && total === undefined;
  const empty = typing && !loading && total === 0;
  const counted = typing && total !== undefined && !loading;

  /** 보내고 나서도 화면은 잠시 그대로라, 같은 검색어를 두 번 보내지 않게 기억한다. */
  const sent = useRef<string | undefined>(undefined);
  const started = useRef(false);
  const countedResult = useRef<string | undefined>(undefined);

  /** 엔터는 고르지 않은 연관검색어를 대신 고르지 않고 입력한 검색어로 결과 목록에 보낸다. 세는 중이면 다 센 뒤에 따른다. */
  const go = useCallback(() => {
    if (total === undefined || total === 0 || sent.current === trimmed) return;
    sent.current = trimmed;
    submitKeyword(trimmed, total);
    router.push(resultsPath(trimmed));
  }, [router, total, trimmed]);

  const { waiting, submit, cancel } = useDeferredSubmit(counted, go);

  const changeKeyword = (next: string) => {
    if (!started.current && next.trim().length > 0) {
      started.current = true;
      track("search_started", { mode: "product" });
    }
    setKeyword(next);
    sent.current = undefined;
    if (next.trim().length === 0) cancel();
  };

  // 0개는 결과 목록으로 가지 않아 그 화면이 남기지 못한다. 결과가 화면에 반영된 뒤 한 번 남긴다.
  useEffect(() => {
    if (!trimmed || loading || total !== 0) return;
    const key = `${trimmed}:${total}`;
    if (countedResult.current === key) return;
    countedResult.current = key;
    track("search_results_viewed", {
      mode: "product",
      query: trimmed,
      result_count: 0,
      include_count: 0,
      exclude_count: 0,
      exclude_group_count: 0,
    });
  }, [loading, total, trimmed]);

  const selectKeyword = (item: RelatedKeywordResponse, position: number) => {
    track("search_suggestion_selected", { mode: "product", query: trimmed, position, keyword: item.keyword });
    rememberKeyword(item.keyword);
    router.push(resultsPath(item.keyword));
  };

  const status = (() => {
    if (!typing || loading || total === undefined) return undefined;
    if (total === 0) return `‘${trimmed}’${josaOf(trimmed, "과/와")} 맞는 제품이 없어요`;
    return `‘${trimmed}’ 결과 ${formatCount(total)}`;
  })();

  return (
    <main className="flex flex-1 flex-col">
      <SubTopBar title="탐색 조건 설정" />
      <div className="flex flex-col px-gutter pt-3 pb-6">
        <Combobox value={keyword} onChange={changeKeyword} open={typing && (total ?? 0) > 0} status={status}>
          <Header>
            <ComboboxInput
              placeholder={PLACEHOLDER}
              label={LABEL}
              onSubmit={() => {
                if (typing) submit();
              }}
            />
          </Header>

          {/* 입력 중에만 상태를 알린다. 엔터를 눌러 세기를 기다리는 동안 무엇을 하는지 말한다. */}
          <p aria-live="polite" className="text-caption text-text-secondary empty:hidden">
            {waiting ? "검색 결과를 확인하고 있어요…" : ""}
          </p>

          {/* 목록이 처음 열릴 때만 입력 쪽에서 살짝 자라 나온다(MOTION 드롭다운 · 자동완성). 모양은 globals.css 가 맡는다. */}
          <div data-suggestions="" className="pt-1 pb-6">
            <ComboboxList label="연관검색어" className="flex flex-col">
              {/* 첫 줄은 입력한 검색어 그대로다. 엔터와 같은 길로 보내, 입력이 멈추기 전에 눌러도 지금 검색어로 다 센 뒤에 간다. */}
              <ComboboxOption onSelect={submit}>
                <KeywordRow label={trimmed} parts={[{ text: trimmed, matched: true }]} />
              </ComboboxOption>
              {items.map((item, index) => (
                <ComboboxOption key={`${index}:${item.keyword}`} onSelect={() => selectKeyword(item, index)}>
                  <KeywordRow label={item.keyword} parts={keywordParts(item)} />
                </ComboboxOption>
              ))}
            </ComboboxList>
          </div>
        </Combobox>

        {typing ? (
          <>
            {searching ? (
              <p className="flex min-h-60 items-center justify-center text-body-sm text-text-secondary">검색하는 중…</p>
            ) : null}

            {empty ? (
              <div className="py-16">
                <EmptyState
                  icon={<Icon name="search" size={28} />}
                  title={`‘${trimmed}’${josaOf(trimmed, "과/와")} 맞는 제품이 없어요`}
                  description={"제품명 철자를 확인하거나,\n브랜드 이름만으로 다시 검색해 보세요."}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col">
            <RecentSearches />
            {children}
          </div>
        )}
      </div>
    </main>
  );
}
