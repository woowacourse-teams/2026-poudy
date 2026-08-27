"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { SearchField } from "@/components/ui/SearchField";
import { track } from "@/lib/analytics/track";
import { useDeferredSubmit } from "@/lib/hooks/useDeferredSubmit";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useProductSuggestions } from "@/lib/hooks/useProductSuggestions";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/storage/recent-searches";

/** S02 제품명 검색 탭. 문구는 design/v1.pen 을 따른다. */
export function ProductSearchPanel() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const { items, total, hasNext, loading, loadNext } = useProductSuggestions(keyword);
  const sentinel = useInfiniteScroll(hasNext && !loading, loadNext);
  const typing = keyword.trim().length > 0;

  const trimmed = keyword.trim();
  const empty = total === 0;
  const searching = loading && items.length === 0;

  /**
   * 엔터는 자동완성 첫 제품이 아니라 검색 결과 목록으로 보낸다. 고르지 않은 제품을
   * 대신 고르지 않는다. 아직 세는 중이면 다 센 뒤에 그 결과를 따른다.
   */
  const counted = trimmed.length > 0 && total !== undefined && !loading;

  /**
   * 보내고 나서도 화면은 잠시 그대로 있다. 그 사이 엔터를 또 누르면 같은 곳으로
   * 두 번 가고 기록도 두 번 남는다. 어느 검색어로 보냈는지 기억해 두고 막는다.
   */
  const sent = useRef<string | undefined>(undefined);
  const started = useRef(false);
  const countedResult = useRef<string | undefined>(undefined);

  const go = useCallback(() => {
    if (total === undefined || total === 0 || sent.current === trimmed) return;

    sent.current = trimmed;
    track("search_submitted", { mode: "product", query: trimmed, result_count: total });
    router.push(`/products?keyword=${encodeURIComponent(trimmed)}`);
  }, [router, total, trimmed]);

  const { waiting, submit, cancel } = useDeferredSubmit(counted, go);

  /** 검색어가 바뀌면 다시 보낼 수 있다. 비우면 기다리던 엔터도 없던 일이 된다. */
  const changeKeyword = useCallback(
    (next: string) => {
      if (!started.current && next.trim().length > 0) {
        started.current = true;
        track("search_started", { mode: "product" });
      }
      setKeyword(next);
      sent.current = undefined;
      if (next.trim().length === 0) cancel();
    },
    [cancel],
  );

  useEffect(() => {
    if (!trimmed || loading || total === undefined) return;

    const key = `${trimmed}:${total}`;
    if (countedResult.current === key) return;
    countedResult.current = key;

    // 결과가 있으면 전체 목록 화면에서 실제 렌더링 뒤에 남긴다.
    if (total > 0) return;
    track("search_results_viewed", {
      mode: "product",
      query: trimmed,
      result_count: 0,
      include_count: 0,
      exclude_count: 0,
      exclude_group_count: 0,
    });
  }, [loading, total, trimmed]);

  const handleSubmit = () => {
    if (trimmed.length === 0) return;
    submit();
  };

  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );

  return (
    /* 입력 묶음과 그 아래 목록은 서로 다른 덩어리라 넉넉히 벌린다. */
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <SearchField
          value={keyword}
          onChange={changeKeyword}
          placeholder="브랜드 또는 제품명을 입력해 주세요"
          label="제품명 검색"
          onSubmit={handleSubmit}
        />
        {/*
          입력 전에는 아무 말도 하지 않는다. 입력창의 안내 문구가 이미 무엇을 넣는
          자리인지 말하고 있어, 그 아래에 한 번 더 얹으면 같은 말이 겹친다.
          검색 중이나 입력 중처럼 상태가 바뀌는 동안에만 낭독기에 알린다.
        */}
        <p aria-live="polite" className="text-[12px] text-text-secondary empty:hidden">
          {waiting
            ? "검색 결과를 확인하고 있어요…"
            : typing
              ? "검색어로 전체 목록을 보거나 제품을 바로 선택하세요."
              : ""}
        </p>
      </div>

      {typing && searching ? (
        <p className="flex min-h-60 items-center justify-center text-[13px] text-text-secondary">검색하는 중…</p>
      ) : typing ? (
        <>
          {empty ? (
            <p className="rounded-xl bg-surface p-3 text-center text-[13px] text-text-secondary">
              ‘{trimmed}’에 대한 검색 결과가 없어요
            </p>
          ) : (
            <Link
              href={`/products?keyword=${encodeURIComponent(trimmed)}`}
              onClick={() => track("search_submitted", { mode: "product", query: trimmed, result_count: total ?? 0 })}
              className="flex items-center gap-3 rounded-xl bg-surface p-3"
            >
              <Icon name="search" size={18} className="text-text-secondary" />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-text-primary">‘{trimmed}’가 포함된 제품 검색</span>
                <span className="text-[11px] text-text-secondary">
                  {total === undefined
                    ? "검색 결과 전체 보기"
                    : `검색 결과 ${total.toLocaleString("ko-KR")}개 전체 보기`}
                </span>
              </span>
              <Icon name="chevron-right" size={16} className="text-text-secondary" />
            </Link>
          )}

          {empty ? null : (
            <section>
              <h2 className="flex items-center gap-1.5 pb-2">
                <span className="text-[15px] font-bold text-text-primary">제품 바로가기</span>
                {total === undefined ? null : (
                  <span className="text-[12px] font-medium text-text-secondary">{total.toLocaleString("ko-KR")}개</span>
                )}
              </h2>

              <ul className="divide-y divide-divider">
                {items.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      href={`/products/${item.id}?from=suggestion`}
                      onClick={() => {
                        track("search_suggestion_selected", {
                          mode: "product",
                          query: keyword.trim(),
                          position: index,
                          product_id: item.id,
                        });
                        addRecentSearch({
                          productId: item.id,
                          name: item.name,
                          brandName: item.brandName,
                        });
                      }}
                      className="flex items-center gap-3 py-3"
                    >
                      <Image
                        src={item.imageUrl || PRODUCT_PLACEHOLDER}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-lg bg-transparent object-contain"
                      />
                      <span className="flex flex-1 flex-col gap-0.5">
                        <span className="text-[13px] font-semibold text-text-primary">{item.name}</span>
                        <span className="text-[11px] text-text-secondary">{item.brandName}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div ref={sentinel} className="h-6" />

              {loading ? <p className="pb-2 text-center text-[13px] text-text-secondary">불러오는 중…</p> : null}

              {items.length === 0 && !loading ? (
                <p className="py-8 text-center text-[13px] text-text-secondary">검색 결과가 없어요.</p>
              ) : null}
            </section>
          )}
        </>
      ) : (
        <RecentSearches items={recent} />
      )}
    </div>
  );
}

function RecentSearches({
  items,
}: {
  readonly items: readonly { productId: number; name: string; brandName: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <>
      <section>
        {/* 제목과 그 아래 목록은 한 덩어리라 바짝 붙인다. */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-[15px] font-bold text-text-primary">최근 검색</h2>
          <button type="button" onClick={clearRecentSearches} className="text-[12px] font-medium text-text-secondary">
            전체 삭제
          </button>
        </div>

        <ul className="divide-y divide-divider">
          {items.map((item, index) => (
            <li key={item.productId} className="flex items-center gap-2 py-3">
              <Link
                href={`/products/${item.productId}?from=recent_search`}
                onClick={() => track("recent_search_used", { position: index, product_id: item.productId })}
                className="flex flex-1 flex-col gap-0.5"
              >
                <span className="text-[13px] font-semibold text-text-primary">{item.name}</span>
                <span className="text-[11px] text-text-secondary">{item.brandName}</span>
              </Link>
              <button
                type="button"
                onClick={() => removeRecentSearch(item.productId)}
                aria-label={`${item.name} 최근 검색에서 삭제`}
                className="flex size-8 items-center justify-center"
              >
                <Icon name="x" size={14} className="text-text-secondary" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
