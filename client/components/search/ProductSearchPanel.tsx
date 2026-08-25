"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

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
      setKeyword(next);
      sent.current = undefined;
      if (next.trim().length === 0) cancel();
    },
    [cancel],
  );

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
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <SearchField
          value={keyword}
          onChange={changeKeyword}
          placeholder="브랜드 또는 제품명을 입력해 주세요"
          label="제품명 검색"
          onSubmit={handleSubmit}
        />
        <p aria-live="polite" className="text-[12px] text-text-secondary">
          {waiting
            ? "검색 결과를 확인하고 있어요…"
            : typing
              ? "검색어로 전체 목록을 보거나 제품을 바로 선택하세요."
              : "제품명을 입력하면 일치하는 제품을 바로 보여드려요."}
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
                      href={`/products/${item.id}`}
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

          {empty ? null : (
            <p className="text-[11px] text-text-secondary">검색어는 목록으로, 제품 선택은 상세 화면으로 이동해요.</p>
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
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-[15px] font-bold text-text-primary">최근 검색</h2>
          <button type="button" onClick={clearRecentSearches} className="text-[12px] font-medium text-text-secondary">
            전체 삭제
          </button>
        </div>

        <ul className="divide-y divide-divider">
          {items.map((item, index) => (
            <li key={item.productId} className="flex items-center gap-2 py-3">
              <Link
                href={`/products/${item.productId}`}
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

      <p className="text-[11px] text-text-secondary">최근 선택한 제품을 다시 확인할 수 있어요.</p>
    </>
  );
}
