"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { Icon } from "@/components/ui/icons/Icon";
import { ProductCard } from "@/components/ui/ProductCard";
import { SearchField } from "@/components/ui/SearchField";
import type { SortOption } from "@/components/ui/SortDropdown";
import { SortHeader } from "@/components/ui/SortHeader";
import { track } from "@/lib/analytics/track";
import { fetchStorage } from "@/lib/api/products";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";

/**
 * 저장함이 가질 수 있는 상태.
 * 실패를 빈 목록과 구분해야 사용자가 다시 시도할 수 있다.
 */
type Status = "loading" | "error" | "ready";

/**
 * 저장함의 정렬. 최근 저장순은 브라우저가 들고 있는 저장 차례라 API 의 sort 에 없다.
 * 그래서 제품 목록의 정렬을 그대로 쓰지 않고 이 화면의 것을 따로 둔다.
 */
type SavedSort = "SAVED_DESC" | "NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC";

const SAVED_SORT_OPTIONS: readonly SortOption<SavedSort>[] = [
  { value: "SAVED_DESC", label: "최근 저장순" },
  { value: "NAME_ASC", label: "이름 오름차순" },
  { value: "NAME_DESC", label: "이름 내림차순" },
  { value: "PRICE_ASC", label: "가격 낮은순" },
  { value: "PRICE_DESC", label: "가격 높은순" },
];

const sortProducts = (
  products: readonly ProductResponse[],
  sort: SavedSort,
  savedIds: readonly number[],
): readonly ProductResponse[] => {
  if (sort === "SAVED_DESC") {
    // savedIds 는 최근에 저장한 것이 앞에 온다.
    return products.toSorted((a, b) => savedIds.indexOf(a.id) - savedIds.indexOf(b.id));
  }
  if (sort === "NAME_ASC") return products.toSorted((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  if (sort === "NAME_DESC") return products.toSorted((a, b) => b.name.localeCompare(a.name, "ko-KR"));
  if (sort === "PRICE_ASC") return products.toSorted((a, b) => a.price - b.price);
  return products.toSorted((a, b) => b.price - a.price);
};

/** 화면에 한 번에 더 그릴 개수. 서버가 나누어 주지 않아 화면에서 끊어 보여 준다. */
const PAGE_SIZE = 20;

/** 담아 둔 번호에서 빠진 제품을 덜어 낸다. 서버에 다시 묻지 않고 가진 것만 추린다. */
const keptFrom = (state: State, key: string, savedIds: readonly number[]): State => ({
  key,
  status: state.status === "error" ? "error" : "ready",
  items: state.items.filter((product) => savedIds.includes(product.id)),
});

type State = {
  readonly key: string;
  readonly status: Status;
  readonly items: readonly ProductResponse[];
};

/** S07 저장함. 목록은 브라우저가 들고 표시 정보만 서버에서 채운다. */
export function SavedScreen() {
  const { savedIds, isSaved, toggle } = useSavedProducts();
  const key = savedIds.join(",");
  const [keyword, setKeyword] = useState("");
  /*
   * 한글을 모으는 동안에는 거르지 않는다. `ㅅ` 이나 `수` 처럼 아직 완성되지 않은
   * 글자로 걸러 내면 곧 사라질 결과가 잠깐씩 스쳐 목록이 어지럽다.
   * 입력 칸에는 지금 치는 글자를 그대로 보여 주고, 거르는 데 쓰는 말만 붙잡아 둔다.
   */
  const [composing, setComposing] = useState(false);
  const [settled, setSettled] = useState("");
  const [sort, setSort] = useState<SavedSort>("SAVED_DESC");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // 저장 목록이 비면 부를 API 가 없으므로 곧바로 끝난 상태로 둔다.
  const initial = (id: string): State => ({
    key: id,
    status: id ? "loading" : "ready",
    items: [],
  });

  const [state, setState] = useState<State>(() => initial(key));
  const [retry, setRetry] = useState(0);

  /*
   * 저장을 풀면 담아 둔 번호가 줄지만 그 제품의 표시 정보는 이미 갖고 있다. 목록을
   * 버리고 다시 부르면 화면이 통째로 비었다가 돌아와 카드 하나를 뺀 것치고 요란하다.
   * 줄어든 때는 가진 것에서 걸러 내고, 처음 보거나 번호가 늘었을 때만 서버를 부른다.
   */
  const known = new Set(state.items.map((product) => product.id));
  const needsFetch = savedIds.some((id) => !known.has(id));

  const current = state.key === key ? state : keptFrom(state, key, savedIds);
  if (state.key !== key) setState(current);

  useEffect(() => {
    if (!key || !needsFetch) return;

    const controller = new AbortController();

    fetchStorage(key.split(",").map(Number))
      .then((response) => {
        if (controller.signal.aborted) return;
        setState((previous) =>
          previous.key === key ? { ...previous, status: "ready", items: response.items } : previous,
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.key === key ? { ...previous, status: "error" } : previous));
      });

    return () => controller.abort();
  }, [key, needsFetch, retry]);

  const onToggleSave = (productId: number) => {
    toggle(productId);
    track(isSaved(productId) ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "saved",
    });
  };

  // 저장한 제품 안에서만 찾는다. 서버에 다시 묻지 않는다.
  if (!composing && settled !== keyword) setSettled(keyword);

  const matched = settled.trim()
    ? current.items.filter((product) =>
        `${product.name} ${product.brand.name}`.toLowerCase().includes(settled.trim().toLowerCase()),
      )
    : current.items;
  const ordered = sortProducts(matched, sort, savedIds);
  const shown = ordered.slice(0, visible);
  const hasNext = shown.length < ordered.length;

  // 찾는 말이나 차례가 바뀌면 처음부터 다시 보여 준다.
  const [shownKey, setShownKey] = useState(`${settled}|${sort}`);
  if (shownKey !== `${settled}|${sort}`) {
    setShownKey(`${settled}|${sort}`);
    setVisible(PAGE_SIZE);
  }

  const showMore = useCallback(() => setVisible((count) => count + PAGE_SIZE), []);
  const sentinel = useInfiniteScroll(hasNext, showMore);

  if (current.status === "loading") {
    return (
      <main className="flex-1 px-4">
        <p className="py-14 text-center text-[13px] text-text-secondary">불러오는 중…</p>
      </main>
    );
  }

  if (current.status === "error") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-14">
        <Icon name="info" size={28} className="text-text-secondary" />
        <p className="text-[15px] font-bold text-text-primary">저장한 제품을 불러오지 못했어요</p>
        <p className="text-center text-[12px] text-text-secondary">
          잠시 후 다시 시도해 주세요. 저장한 목록은 그대로 있어요.
        </p>
        <button
          type="button"
          onClick={() => {
            setState({ key, status: "loading", items: [] });
            setRetry((previous) => previous + 1);
          }}
          className="mt-2 h-11 rounded-button border border-border px-5 text-[14px] font-bold text-text-primary"
        >
          다시 시도
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4">
      {/* 제품 목록과 같은 차례로 둔다. 찾는 칸이 위에 서고 그 아래에 개수와 차례가 온다. */}
      {current.items.length > 0 ? (
        <div className="pt-3">
          <SearchField
            value={keyword}
            onChange={setKeyword}
            onChangeComposing={setComposing}
            placeholder="저장한 제품 검색"
            label="저장한 제품 검색"
          />
          <SortHeader total={ordered.length} sort={sort} onChangeSort={setSort} options={SAVED_SORT_OPTIONS} />
        </div>
      ) : null}

      {/* 바탕이 이미 화면 여백을 쥐고 있어 빈 자리에는 안쪽 여백을 더하지 않는다. */}
      {current.items.length === 0 ? (
        <div className="py-4">
          <EmptyNotice icon="bookmark" size="screen" title="저장한 제품이 없어요" />
        </div>
      ) : null}

      {/* 저장한 제품은 그 사람의 관심사라 세션 리플레이에서 가린다. */}
      <ul data-private className="divide-y divide-divider">
        {shown.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              saved={isSaved(product.id)}
              onToggleSave={onToggleSave}
              entryPoint="saved"
              keyword={settled}
            />
          </li>
        ))}
      </ul>

      {/* 더 그릴 것이 있을 때만 자리를 둔다. 빈 자리 아래에 남으면 여백만 커진다. */}
      {hasNext ? <div ref={sentinel} className="h-10" /> : null}

      {current.items.length > 0 && shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-text-secondary">검색 결과가 없어요.</p>
      ) : null}

      <Link href="/search/products" className="mt-2 mb-6 flex items-center gap-3 rounded-xl bg-surface p-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background">
          <Icon name="plus" size={20} className="text-text-secondary" />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-bold text-text-primary">저장할 제품 더 찾기</span>
          <span className="text-[11px] text-text-secondary">탐색 결과에서 제품을 추가할 수 있어요</span>
        </span>
        <Icon name="chevron-right" size={16} className="text-text-secondary" />
      </Link>
    </main>
  );
}
