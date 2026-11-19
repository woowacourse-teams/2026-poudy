"use client";

import type { ProductSuggestionResponse } from "@poudy/api/api.zod";
import { Combobox, ComboboxInput, ComboboxList, ComboboxOption } from "@poudy/design-system/combobox";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type FocusEvent, useEffect, useState } from "react";

import { PopularDupes } from "./PopularDupes";
import { SimilarityShelf } from "./SimilarityShelf";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { RecentSearches } from "@/components/search/RecentSearches";
import { MatchedText } from "@/components/ui/MatchedText";
import { ProductImage } from "@/components/ui/ProductImage";
import { selectSimilarSource } from "@/lib/analytics/similar-products";
import { formatCount } from "@/lib/domain/format";
import { splitByKeyword, splitByRange } from "@/lib/domain/highlight";
import type { PopularDupe } from "@/lib/domain/popular-dupes";
import { SIMILAR_PRODUCTS_PATH, similarProductsHref } from "@/lib/domain/similar-products";
import { useSimilarityShelf } from "@/lib/hooks/useSimilarityShelf";
import { useSimilarProductSearch } from "@/lib/hooks/useSimilarProductSearch";
import { addRecentSearch, type RecentSearch } from "@/lib/storage/recent-searches";

/** 검색 중 스켈레톤 행 수(명세 S274-1). */
const SEARCH_SKELETON_ROWS = 3;

/**
 * 유사템 시작 화면(명세 S271 · S272 · S274 · S274-1 · S275 · S285).
 *
 * 입력칸 → 소개 판 → (회원) 내 파우치 → 요즘 많이 찾는 저렴이 순서다. 입력칸을 누르면 다른 섹션을 접고 최근 검색만,
 * 입력하면 검색 결과만 보여 준다. 접은 섹션은 입력칸에서 포커스가 빠지고 입력이 비어야 다시 펼친다.
 * 접은 섹션은 지우지 않고 hidden 으로 숨겨, 펼칠 때 파우치를 다시 받지 않는다. 숨긴 섹션은 낭독기에도 읽히지 않는다.
 */
export function SimilarProductsStart({ popularDupes }: { readonly popularDupes: readonly PopularDupe[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [keyword, setKeyword] = useState(() => params.get("q") ?? "");
  const [composing, setComposing] = useState(false);
  const [focused, setFocused] = useState(false);
  const search = useSimilarProductSearch(keyword, composing);
  const shelf = useSimilarityShelf();
  const showSkeleton = useDelayedFlag(search.status === "loading");
  const typing = keyword.trim() !== "";
  const collapsed = focused || typing;
  const rememberKeyword = () => {
    const query = new URLSearchParams({ q: keyword.trim() });
    window.history.replaceState(null, "", keyword.trim() ? `${SIMILAR_PRODUCTS_PATH}?${query}` : SIMILAR_PRODUCTS_PATH);
  };
  // 입력값은 React 상태로 유지한다. 기존 검색 화면처럼 입력이 멈춘 값만 주소에 남긴다.
  useEffect(() => {
    if (composing || search.keyword !== keyword.trim()) return;
    const query = new URLSearchParams({ q: search.keyword });
    window.history.replaceState(null, "", search.keyword ? `${SIMILAR_PRODUCTS_PATH}?${query}` : SIMILAR_PRODUCTS_PATH);
  }, [composing, keyword, search.keyword]);
  useTrackedView(
    "similar_search_results_viewed",
    { query_length: search.keyword.length, displayed_count: search.items.length },
    {
      key: `${search.keyword}:${search.items.map((p) => p.id).join(",")}`,
      enabled: search.status === "ready" && !composing && search.keyword === keyword.trim(),
    },
  );
  const status = search.status === "ready" ? `검색 결과 ${formatCount(search.items.length)}` : "";
  const selectProduct = (product: ProductSuggestionResponse) => {
    rememberKeyword();
    // 제품명 검색(S46)과 같은 최근 검색 기록에 이 검색어를 남긴다.
    addRecentSearch({ kind: "keyword", keyword: keyword.trim() });
    selectSimilarSource(product.id, "search");
    router.push(similarProductsHref(product.id));
  };
  // 최근 검색을 고르면 그 말로 이 화면에서 다시 검색한다. 제품 기록은 제품 이름으로 찾는다.
  const selectRecent = (item: RecentSearch) => setKeyword(item.kind === "product" ? item.name : item.keyword);
  // 입력칸과 최근 검색 사이에서 포커스가 오가는 동안에는 펼치지 않는다.
  const leave = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-inquiry">
      <section
        className="flex flex-col gap-4"
        aria-label="제품으로 유사템 찾기"
        onFocus={() => setFocused(true)}
        onBlur={leave}
      >
        <div>
          <Combobox
            value={keyword}
            onChange={setKeyword}
            open={search.status === "ready" && search.items.length > 0}
            status={status}
          >
            <ComboboxInput
              label="유사템 기준 제품 검색"
              placeholder="찾고 싶은 제품 이름을 입력해 주세요"
              onChangeComposing={setComposing}
            />
            <ComboboxList label="제품 검색 결과">
              {search.items.map((product) => (
                <ComboboxOption key={product.id} onSelect={() => selectProduct(product)}>
                  <SuggestionRow product={product} keyword={search.keyword} />
                </ComboboxOption>
              ))}
            </ComboboxList>
          </Combobox>
          {typing && search.status === "loading" ? (
            <div aria-busy="true">
              <span role="status" className="sr-only">
                제품을 찾고 있어요
              </span>
              {showSkeleton ? <SuggestionSkeleton /> : null}
            </div>
          ) : null}
          {search.status === "error" ? (
            <ErrorState variant="section" onRetry={search.retry}>
              검색 결과를 불러오지 못했어요
            </ErrorState>
          ) : null}
          {search.status === "ready" && search.items.length === 0 ? (
            <EmptyState title="검색한 제품이 없어요" description="브랜드나 제품 이름을 다시 확인해 주세요." />
          ) : null}
        </div>
        {focused && !typing ? (
          // 행을 누르는 동안 입력칸이 포커스를 잃으면 섹션이 펼쳐지며 행이 자리를 옮긴다. 누름의 기본 동작을 막아 포커스를 둔다.
          <div className="pt-2" onMouseDown={(event) => event.preventDefault()}>
            <RecentSearches onSelect={selectRecent} />
          </div>
        ) : null}
        <div hidden={collapsed} className="flex flex-col gap-4">
          {/* 관리자 세션은 파우치를 쓸 수 없다. 높이를 고정한 파우치 섹션 대신 여기서 안내한다. */}
          {shelf.state.status === "adminSession" ? <AdminSessionNotice className="flex flex-col gap-4" /> : null}
          <SimilarityIntro />
        </div>
      </section>
      <div hidden={collapsed || shelf.state.status === "adminSession"}>
        <SimilarityShelf state={shelf.state} retry={shelf.retry} />
      </div>
      <div hidden={collapsed}>
        <PopularDupes items={popularDupes} />
      </div>
    </div>
  );
}

/**
 * 소개 판(명세 S271 r7PqQ). 큰 제목 대신 무엇을 찾는 화면인지 알린다. 아이콘은 홈 바로가기 '유사템찾기'와 같은 그림이다.
 * 판 바탕은 명세 값(#FFF1EE)이 토큰에 없어 가장 가까운 브랜드 옅은 면(brand-soft)을 쓴다.
 */
function SimilarityIntro() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-brand-soft p-4">
      {/* 벡터라 최적화할 것이 없어 건너뛴다. 옆 글자가 뜻을 전하므로 alt 를 비운다(A11Y D05). */}
      <Image
        src="/images/shortcuts/similar-products.svg"
        alt=""
        width={40}
        height={40}
        loading="eager"
        unoptimized
        draggable={false}
        className="size-10 shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-section font-bold text-text-primary">
          성분은 비슷한데 가격은 <span className="text-brand-text">절반</span>이라면?
        </h2>
        <p className="text-body-sm text-text-secondary">내 피부에 맞던 성분 그대로, 더 저렴하게</p>
      </div>
    </div>
  );
}

/** 제품명에서 맞은 자리. 서버가 제품명으로 맞혔으면 그 범위를, 아니면 검색어를 이름에서 다시 찾는다. */
const nameParts = (product: ProductSuggestionResponse, keyword: string) =>
  product.match.field === "PRODUCT_NAME" ? splitByRange(product.match) : splitByKeyword(product.name, keyword);

/**
 * 제품 후보 행(명세 S274 flTrq). 입력어와 맞는 글자를 브랜드 글자색으로 칠한다.
 * 행 사이 구분선은 제품명 검색의 연관검색어 행처럼 행마다 아래에 긋는다(후보 칸의 모양은 부품이 정한다).
 */
function SuggestionRow({
  product,
  keyword,
}: {
  readonly product: ProductSuggestionResponse;
  readonly keyword: string;
}) {
  return (
    <span className="flex items-center gap-2 border-b border-border py-4">
      <ProductImage src={product.imageUrl} size={48} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
        <span className="line-clamp-2 text-title font-medium">
          <MatchedText
            label={product.name}
            parts={nameParts(product, keyword)}
            plainClassName="text-text-primary"
            dimmedClassName="text-text-primary"
            matchedClassName="text-brand-text"
          />
        </span>
      </span>
    </span>
  );
}

/** 검색 중(명세 S274-1). 후보 행과 같은 자리·크기다. 늦게 켜고 잠깐 유지한다(FEEDBACK F02). */
function SuggestionSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: SEARCH_SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center gap-2 border-b border-border py-4">
          <Skeleton shape="box" className="size-12" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton shape="line" size={12} className="w-16" />
            <Skeleton shape="line" size={15} className="w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
