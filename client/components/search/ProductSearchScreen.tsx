"use client";

import type { ProductSuggestionResponse } from "@poudy/api/api.zod";
import { Combobox, ComboboxGroup, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { SearchField } from "@poudy/design-system/search-field";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { RecentSearches } from "./RecentSearches";
import { SearchModeTabs } from "./SearchModeTabs";
import { SearchTopBar } from "./SearchTopBar";

import { MatchedText } from "@/components/ui/MatchedText";
import { ProductImage } from "@/components/ui/ProductImage";
import { track } from "@/lib/analytics/track";
import { recordSearchKeyword } from "@/lib/api/products";
import { formatCount, josaOf } from "@/lib/domain/format";
import { splitByRange } from "@/lib/domain/highlight";
import { useDeferredSubmit } from "@/lib/hooks/useDeferredSubmit";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useProductSuggestions } from "@/lib/hooks/useProductSuggestions";
import { ANCHOR_ATTRIBUTE } from "@/lib/navigation/scroll-anchor";
import { addRecentFilter } from "@/lib/storage/recent-filters";
import { addRecentSearch } from "@/lib/storage/recent-searches";

const PLACEHOLDER = "브랜드 또는 제품명을 입력해 주세요";
const LABEL = "제품명 검색";

/**
 * 제품 이름에서 맞은 자리를 토막 낸다. 브랜드로 걸린 줄은 이름에 맞은 자리가 없어 한 토막으로 둔다.
 * 계약이 어긋나도 자동완성 전체가 무너지지 않게, 표시할 자리만 잃고 이름은 그대로 읽히게 둔다.
 */
const nameParts = (item: ProductSuggestionResponse) => {
  if (item.match?.field !== "PRODUCT_NAME") return [{ text: item.name, matched: false }];
  return splitByRange(item.match);
};

/**
 * 실제로 검색을 보낸 말만 인기 검색어 집계에 남긴다. 치는 도중의 값까지 세면 순위가 타이핑 조각으로 채워진다.
 * 집계는 부수적인 일이라 실패해도 검색을 막지 않는다.
 */
const recordKeyword = (keyword: string): void => {
  void recordSearchKeyword(keyword).catch(() => undefined);
};

/** 결과 목록을 열 때 남기는 기록. 홈의 최근 탐색 조건 카드와 이 화면의 최근 검색에 함께 쓴다. */
const rememberKeyword = (keyword: string, total: number) => {
  track("search_submitted", { mode: "product", query: keyword, result_count: total });
  addRecentSearch({ kind: "keyword", keyword });
  recordKeyword(keyword);
  addRecentFilter({ query: `keyword=${encodeURIComponent(keyword)}`, summary: keyword, mode: "product" });
};

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
 * 검색어를 읽기 전의 S21. 검색어가 없을 때와 같은 모양이다. 검색어는 주소에서 읽어 브라우저에서만 알 수 있어,
 * 미리 만든 HTML 에는 이 모양이 담긴다. 최근 검색은 기기에만 있어 여기서는 그리지 않는다.
 */
export function ProductSearchScreenFallback({ children }: ProductSearchScreenProps) {
  return (
    <main className="flex flex-1 flex-col">
      <SearchTopBar />
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
  const { items, total, hasNext, loading, loadNext, keyword: searched } = useProductSuggestions(keyword);

  /*
   * 검색어를 주소에 남긴다. 화면이 들고 있으면 상세로 나갔다 돌아왔을 때 사라진다.
   * `router.replace` 는 서버를 한 번 다녀오므로 history API 만 갈아 끼운다. 주소는 화면 밖 저장소라 effect 로 맞춘다.
   */
  useEffect(() => {
    const query = searched ? `?keyword=${encodeURIComponent(searched)}` : "";
    window.history.replaceState(null, "", `/search/products${query}`);
  }, [searched]);

  const sentinel = useInfiniteScroll(hasNext && !loading, loadNext);
  const trimmed = keyword.trim();
  const typing = trimmed.length > 0;
  const searching = loading && items.length === 0;
  const empty = typing && !loading && total === 0;
  const counted = typing && total !== undefined && !loading;

  /** 보내고 나서도 화면은 잠시 그대로라, 같은 검색어를 두 번 보내지 않게 기억한다. */
  const sent = useRef<string | undefined>(undefined);
  const started = useRef(false);
  const countedResult = useRef<string | undefined>(undefined);

  /** 엔터는 고르지 않은 제품을 대신 고르지 않고 결과 목록으로 보낸다. 세는 중이면 다 센 뒤에 따른다. */
  const go = useCallback(() => {
    if (total === undefined || total === 0 || sent.current === trimmed) return;
    sent.current = trimmed;
    rememberKeyword(trimmed, total);
    router.push(`/products?keyword=${encodeURIComponent(trimmed)}`);
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

  const selectProduct = (item: ProductSuggestionResponse, position: number) => {
    track("search_suggestion_selected", { mode: "product", query: trimmed, position, product_id: item.id });
    addRecentSearch({ kind: "product", productId: item.id, name: item.name, brandName: item.brandName });
    router.push(`/products/${item.id}?from=suggestion`);
  };

  const status = (() => {
    if (!typing || loading || total === undefined) return undefined;
    if (total === 0) return `‘${trimmed}’${josaOf(trimmed, "과/와")} 맞는 제품이 없어요`;
    return `‘${trimmed}’ 결과 ${formatCount(total)}`;
  })();

  return (
    <main className="flex flex-1 flex-col">
      <SearchTopBar />
      <div className="flex flex-col px-gutter pt-3 pb-6">
        <Combobox value={keyword} onChange={changeKeyword} open={typing && items.length > 0} status={status}>
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
          <div data-suggestions="">
            <ComboboxList label="제품 자동완성" className="flex flex-col">
              <ComboboxOption
                onSelect={() => {
                  if (total === undefined || total === 0) return;
                  rememberKeyword(trimmed, total);
                  router.push(`/products?keyword=${encodeURIComponent(trimmed)}`);
                }}
              >
                <span className="flex min-h-17 items-center gap-3 border-b border-border">
                  <span className="flex size-12 shrink-0 items-center justify-center text-text-primary">
                    <Icon name="search" size={20} />
                  </span>
                  <span className="min-w-0 flex-1 text-title text-text-primary">
                    <span className="font-bold">‘{trimmed}’</span> 검색 결과
                  </span>
                  {total === undefined ? null : (
                    <span className="shrink-0 text-body-sm text-text-muted">{formatCount(total)}</span>
                  )}
                </span>
              </ComboboxOption>

              <ComboboxGroup
                label={<h2 className="pt-6 pb-1 text-section font-bold text-text-primary">제품 바로가기</h2>}
                className="flex flex-col"
              >
                {items.map((item, index) => (
                  <ComboboxOption key={item.id} onSelect={() => selectProduct(item, index)}>
                    {/* 되돌아왔을 때 보던 제품을 다시 찾는 표식이다. */}
                    <span
                      {...{ [ANCHOR_ATTRIBUTE]: item.id }}
                      className={
                        index < items.length - 1
                          ? "flex min-h-17 items-center gap-3 border-b border-border py-2"
                          : "flex min-h-17 items-center gap-3 py-2"
                      }
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center">
                        <ProductImage src={item.imageUrl} size={40} loading="lazy" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        {/* 맞은 자리는 굵기로 가른다. 이름의 바탕 굵기가 보통이라 굵은 자리가 그대로 드러난다. */}
                        <MatchedText
                          label={item.name}
                          parts={nameParts(item)}
                          plainClassName="line-clamp-2 text-title text-text-primary"
                          dimmedClassName="line-clamp-2 text-title text-text-primary"
                          matchedClassName="font-bold"
                        />
                        <span className="truncate text-body-sm text-text-secondary">{item.brandName}</span>
                      </span>
                    </span>
                  </ComboboxOption>
                ))}
              </ComboboxGroup>
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

            <div ref={sentinel} className="h-px" />
            {loading && items.length > 0 ? (
              <p className="py-2 text-center text-body-sm text-text-secondary">불러오는 중…</p>
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
