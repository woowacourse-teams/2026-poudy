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
import { StickyBar } from "@/components/ui/StickyBar";
import { track } from "@/lib/analytics/track";
import { fetchStorage } from "@/lib/api/products";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { restoreProducts, savedEntriesOf, type RemovedEntry } from "@/lib/storage/saved-products";

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
    /*
     * savedIds 는 최근에 저장한 것이 앞에 온다. 되돌릴 자리로 남은 제품까지 담은
     * 차례를 받으므로, 저장을 푼 것도 제자리에 그대로 선다.
     */
    return products.toSorted((a, b) => savedIds.indexOf(a.id) - savedIds.indexOf(b.id));
  }
  if (sort === "NAME_ASC") return products.toSorted((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  if (sort === "NAME_DESC") return products.toSorted((a, b) => b.name.localeCompare(a.name, "ko-KR"));
  if (sort === "PRICE_ASC") return products.toSorted((a, b) => a.price - b.price);
  return products.toSorted((a, b) => b.price - a.price);
};

/** 화면에 한 번에 더 그릴 개수. 서버가 나누어 주지 않아 화면에서 끊어 보여 준다. */
const PAGE_SIZE = 20;

/**
 * 담아 둔 번호에서 빠진 제품을 덜어 낸다. 서버에 다시 묻지 않고 가진 것만 추린다.
 *
 * 되돌릴 수 있게 남겨 둔 제품은 저장이 풀렸어도 덜어 내지 않는다. 그 자리에
 * 되돌리기를 그려야 하고, 카드가 곧바로 빠지면 아래 목록이 위로 올라온다.
 */
const keptFrom = (
  state: State,
  next: { readonly key: string; readonly savedIds: readonly number[]; readonly kept: readonly number[] },
): State => ({
  key: next.key,
  status: state.status === "error" ? "error" : "ready",
  items: state.items.filter((product) => next.savedIds.includes(product.id) || next.kept.includes(product.id)),
  missingIds: state.missingIds.filter((id) => next.savedIds.includes(id)),
});

type State = {
  readonly key: string;
  readonly status: Status;
  readonly items: readonly ProductResponse[];
  /** 성공 응답에 없어서 지금은 표시 정보를 채울 수 없는 저장 제품 번호. */
  readonly missingIds: readonly number[];
};

/**
 * 지금 불러오지 못한 제품을 알리는 콜아웃. 제품 상세의 `상품 정보 출처 안내` 에서
 * 아이콘·제목·설명·행동의 차례와 크기를 가져왔다.
 *
 * 다만 바탕은 좌우로 넓히지 않는다. 상세에서는 이런 칸이 여러 섹션 사이에 끼어 있어
 * 화면 끝까지 닿는 바탕이 자연스럽지만, 여기서는 목록 위에 홀로 서 있어 너무 넓어 보인다.
 *
 * 아이콘 자리는 뜻에 맞는 색을 입힌다. 잃은 것이 아니라 잠시 못 보는 상태라 알림 색을 쓴다.
 */
function MissingNotice({
  count,
  onRecheck,
  onDismiss,
}: {
  readonly count: number;
  readonly onRecheck: () => void;
  readonly onDismiss: () => void;
}) {
  return (
    <section
      role="status"
      aria-labelledby="missing-saved-products-title"
      className="mt-3 flex gap-3 rounded-xl bg-surface-subtle p-4"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[14px] bg-info-soft">
        <Icon name="info" size={16} className="text-info" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span id="missing-saved-products-title" className="text-[14px] font-bold text-text-primary">
          제품 {count}개를 지금은 불러올 수 없어요
        </span>
        <span className="text-pretty text-[12px] text-[#5F6268]">
          저장은 그대로 있어요. {"제품\u00a0정보가\u00a0바뀌는\u00a0동안"} 잠시 보이지 않을 수 있어요.
        </span>

        {/* 잠시 못 보는 것일 수 있다고 알리는 자리에서 바로 다시 묻는다. */}
        <span className="flex items-center justify-between gap-2">
          <button type="button" onClick={onDismiss} className="shrink-0 cursor-pointer text-[11px] text-[#8B8D94]">
            그만 보기
          </button>

          <button
            type="button"
            onClick={onRecheck}
            className="flex shrink-0 cursor-pointer items-center gap-0.5 text-[11px] text-[#5F6268]"
          >
            다시 확인
            <Icon name="chevron-right" size={12} />
          </button>
        </span>
      </span>
    </section>
  );
}

/**
 * 이름 뒤에 붙일 주격 조사를 고른다. 받침이 있으면 `이`, 없으면 `가` 다.
 *
 * 한글이 아닌 글자로 끝나는 이름은 읽는 소리를 알 수 없다. 숫자는 읽는 법이 정해져
 * 있어 그 소리의 받침을 따르고(`0`·`1`·`3`·`6`·`7`·`8` 이 받침으로 끝난다),
 * 그 밖의 글자는 `가` 로 둔다. 어느 쪽도 아니면 조사를 붙이지 않는 편이 낫지만,
 * 제품 이름은 대개 한글이나 숫자로 끝나 이 정도로 자연스럽게 읽힌다.
 */
const subjectJosa = (name: string): string => {
  const last = name.trimEnd().at(-1) ?? "";
  const code = last.codePointAt(0) ?? 0;

  // 한글 음절은 U+AC00 부터 28 개의 받침이 되풀이된다. 나머지가 0 이면 받침이 없다.
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? "가" : "이";
  if (/[0136780]/.test(last)) return "이";
  return "가";
};

/**
 * 저장을 푼 카드 위에 덮는 겹. 카드를 치우지 않고 그 위에 얹는다.
 *
 * 카드가 흐릿하게 비쳐 어느 제품인지 그대로 읽힌다. 자리와 높이도 카드 그대로라
 * 아래 목록이 밀리지 않고, 글의 시작선을 따로 맞출 일도 없다.
 *
 * 되돌리기를 목록 안에 두어 어느 제품을 되돌리는지 알 수 있게 한다. 화면 아래
 * 뜨는 알림은 여러 개를 잇달아 풀면 무엇을 되돌리는지 흐려진다.
 */
function UndoRow({
  productName,
  onUndo,
  children,
}: {
  readonly productName: string;
  readonly onUndo: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="relative isolate">
      {/* 카드를 그대로 두고 그 위에 덮는다. 흐릿하게 비쳐 어느 제품인지 그대로 읽힌다. */}
      <div aria-hidden="true" className="pointer-events-none opacity-40 grayscale">
        {children}
      </div>

      <div
        role="status"
        className="absolute inset-0 flex items-center justify-between gap-3 overflow-hidden bg-white/65 px-4 backdrop-blur-[1px]"
      >
        {/*
          이름이 길면 두 줄까지만 보이고 그 뒤는 잘린다. 카드 높이 안에 갇힌 자리라
          줄 수를 묶지 않으면 글이 겹 밖으로 넘친다.
        */}
        <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-5 text-text-secondary">
          <span className="font-bold text-text-primary">{productName}</span>
          {subjectJosa(productName)} 저장함에서 삭제됐어요
        </p>
        <button
          type="button"
          onClick={onUndo}
          aria-label={`${productName} 저장 되돌리기`}
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border bg-white px-3 text-[12px] font-bold text-text-primary"
        >
          되돌리기
        </button>
      </div>
    </div>
  );
}

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
    missingIds: [],
  });

  const [state, setState] = useState<State>(() => initial(key));
  const [retry, setRetry] = useState(0);
  /*
   * 저장을 푼 제품을 되돌릴 수 있게 그 자리에 남겨 둔다. 카드를 곧바로 걷어 내면
   * 아래 목록이 위로 올라와 다음에 누르려던 카드가 손가락 밑으로 밀려 들어온다.
   * 화면을 벗어나면 이 상태가 사라지므로 되돌리지 않은 것은 그대로 지워진다.
   */
  const [pendingRemoval, setPendingRemoval] = useState<readonly RemovedEntry[]>([]);
  /*
   * 저장을 풀기 직전의 차례. 되돌릴 자리를 담았던 그 자리에 세우는 데 쓴다.
   *
   * `savedIds` 만으로는 세울 수 없다. 푼 제품은 거기서 이미 빠져 `indexOf` 가 -1 을
   * 주고 맨 앞으로 튄다. `RemovedEntry.index` 도 쓸 수 없다. 그때그때의 목록을
   * 가리켜, 여러 개를 잇달아 풀면 뒤에 푼 것의 자리가 앞서 빠진 만큼 당겨진다.
   */
  const [orderIds, setOrderIds] = useState<readonly number[]>(savedIds);
  /*
   * 누락 안내를 이번 방문 동안만 닫아 둔다. 저장할 것이 없어 화면을 벗어나면 사라진다.
   *
   * 영영 끄지 않는 이유가 있다. 이 안내는 저장한 것이 보이지 않는다는 사실을 알리는
   * 유일한 통로라, 아주 꺼 버리면 저장함이 조용히 비는 일을 다시 겪게 된다.
   */
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  /** 어느 누락 번호에 대해 닫았는지. 그 뒤에 새로 빠진 것이 있으면 다시 알린다. */
  const [dismissedFor, setDismissedFor] = useState("");

  /*
   * 저장을 풀면 담아 둔 번호가 줄지만 그 제품의 표시 정보는 이미 갖고 있다. 목록을
   * 버리고 다시 부르면 화면이 통째로 비었다가 돌아와 카드 하나를 뺀 것치고 요란하다.
   * 줄어든 때는 가진 것에서 걸러 내고, 처음 보거나 번호가 늘었을 때만 서버를 부른다.
   */
  const removingIds = pendingRemoval.map((entry) => entry.product.id);
  const current = state.key === key ? state : keptFrom(state, { key, savedIds, kept: removingIds });
  if (state.key !== key) setState(current);

  /*
   * 닫아 둔 뒤에 다른 제품이 새로 빠지면 다시 알린다. 닫은 것은 그때 본 안내라
   * 그 뒤에 생긴 일까지 덮으면 저장한 것이 조용히 사라지는 일이 되풀이된다.
   */
  const missingKey = current.missingIds.join(",");
  if (noticeDismissed && dismissedFor !== missingKey) setNoticeDismissed(false);

  /*
   * 되돌릴 자리로 남은 것을 뺀 나머지가 저장 목록과 어긋나면 차례를 다시 잡는다.
   * 새로 담거나 되돌린 경우가 그렇다. 저장을 푼 직후에는 둘이 같아 그대로 둔다.
   */
  const orderWithoutPending = orderIds.filter((id) => !removingIds.includes(id));
  if (orderWithoutPending.join(",") !== savedIds.join(",")) {
    // 담았던 자리를 지키며 새 목록을 받는다. 대기 중인 것은 있던 자리에 그대로 남는다.
    const next = [...savedIds];
    for (const id of orderIds) {
      if (!removingIds.includes(id)) continue;
      next.splice(Math.min(orderIds.indexOf(id), next.length), 0, id);
    }
    setOrderIds(next);
  }

  // 성공 응답에서 빠졌다고 확인한 번호도 다시 물을 필요가 없다. 화면에 다시 들어오면 새로 확인한다.
  const known = new Set([...current.items.map((product) => product.id), ...current.missingIds]);
  const needsFetch = savedIds.some((id) => !known.has(id));

  useEffect(() => {
    if (!key || !needsFetch) return;

    const controller = new AbortController();
    const requestedIds = key.split(",").map(Number);

    fetchStorage(requestedIds)
      .then((response) => {
        if (controller.signal.aborted) return;
        const receivedIds = new Set(response.items.map((product) => product.id));
        const missingIds = requestedIds.filter((id) => !receivedIds.has(id));
        setState((previous) =>
          previous.key === key ? { ...previous, status: "ready", items: response.items, missingIds } : previous,
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.key === key ? { ...previous, status: "error" } : previous));
      });

    return () => controller.abort();
  }, [key, needsFetch, retry]);

  /*
   * 빠진 번호를 잊고 다시 묻는다. 서버가 잠시 실패했을 뿐이면 이것으로 돌아온다.
   * `missingIds` 를 비우면 `needsFetch` 가 다시 참이 되어 위의 효과가 요청을 보낸다.
   */
  const recheckMissing = () => {
    setState((previous) => ({ ...previous, status: "loading", missingIds: [] }));
  };

  const onToggleSave = (productId: number) => {
    /*
     * 저장함에서 푸는 것은 카드가 목록에서 사라지는 일이라 되돌릴 자리를 남긴다.
     * 담았던 때는 저장을 풀기 전에 꺼내 둔다. 풀고 나면 알 수 없다.
     */
    const removing = isSaved(productId);
    const entries = removing ? savedEntriesOf([productId]) : [];

    /*
     * 저장을 푼 제품도 목록에 남겨 두어야 되돌릴 자리를 그린다. `toggle` 이
     * 저장 목록을 바꾸면 그 자리에서 `keptFrom` 이 도는데, 남길 번호를 그보다
     * 먼저 알려 주지 않으면 카드가 걸러져 사라진다.
     */
    if (removing) setPendingRemoval((previous) => [...previous, ...entries]);

    toggle(productId);
    track(removing ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "saved",
    });
  };

  /** 되돌리기를 누르면 담았던 때까지 그대로 되살린다. */
  const undoRemoval = (productId: number) => {
    const entry = pendingRemoval.find((item) => item.product.id === productId);
    if (!entry) return;

    restoreProducts([entry]);
    setPendingRemoval((previous) => previous.filter((item) => item.product.id !== productId));
  };

  // 저장한 제품 안에서만 찾는다. 서버에 다시 묻지 않는다.
  if (!composing && settled !== keyword) setSettled(keyword);

  const matched = settled.trim()
    ? current.items.filter((product) =>
        `${product.name} ${product.brand.name}`.toLowerCase().includes(settled.trim().toLowerCase()),
      )
    : current.items;
  const ordered = sortProducts(matched, sort, orderIds);
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
            setState({ key, status: "loading", items: [], missingIds: [] });
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
    <main className="flex flex-1 flex-col px-4">
      {current.missingIds.length > 0 && !noticeDismissed ? (
        <MissingNotice
          count={current.missingIds.length}
          onRecheck={recheckMissing}
          onDismiss={() => {
            setNoticeDismissed(true);
            setDismissedFor(missingKey);
          }}
        />
      ) : null}

      {/*
        제품 목록과 같은 차례로 둔다. 찾는 칸이 위에 서고 그 아래에 개수와 차례가 온다.
        찾는 칸은 내려 읽는 중에도 바로 고쳐 쓸 수 있도록 상단바(56px) 아래에 붙인다.
        바텀시트의 딤(z-40)과 상단바(z-30) 아래에 둔다.
      */}
      {current.items.length > removingIds.length ? (
        <>
          <StickyBar stuckAt={56} className="sticky top-14 z-20 -mx-4 -mb-2 bg-background px-4 pt-3 pb-2">
            <SearchField
              value={keyword}
              onChange={setKeyword}
              onChangeComposing={setComposing}
              placeholder="저장한 제품 검색"
              label="저장한 제품 검색"
            />
          </StickyBar>
          {/* 되돌리기가 남은 자리는 이미 저장을 푼 것이라 개수에서 뺀다. */}
          <SortHeader
            total={ordered.filter((product) => !removingIds.includes(product.id)).length}
            sort={sort}
            onChangeSort={setSort}
            options={SAVED_SORT_OPTIONS}
          />
        </>
      ) : null}

      {/*
        담긴 것이 없으면 화면에 이 안내뿐이다. 남은 자리를 채워 아래 링크가 화면
        바닥에 붙게 하고, 안내는 그 사이 한가운데에 선다.
      */}
      {current.items.length === 0 && removingIds.length === 0 ? (
        <div className="flex flex-1 flex-col py-4">
          <EmptyNotice
            icon="bookmark"
            image={{ src: "/images/empty-states/no-saved-products-watermark.png", size: 170, loading: "eager" }}
            title={
              current.missingIds.length > 0 ? "저장한 제품을 지금은 불러올 수 없어요" : "아직 저장한 제품이 없어요"
            }
            className="flex-1"
          />
        </div>
      ) : null}

      {/* 저장한 제품은 그 사람의 관심사라 세션 리플레이에서 가린다. */}
      <ul data-private className="divide-y divide-divider">
        {shown.map((product, index) =>
          removingIds.includes(product.id) ? (
            <li key={product.id}>
              <UndoRow productName={product.name} onUndo={() => undoRemoval(product.id)}>
                <ProductCard
                  product={product}
                  saved={false}
                  onToggleSave={onToggleSave}
                  entryPoint="saved"
                  imageLoading={index === 0 ? "eager" : "lazy"}
                  keyword={settled}
                />
              </UndoRow>
            </li>
          ) : (
            <li key={product.id}>
              <ProductCard
                product={product}
                saved={isSaved(product.id)}
                onToggleSave={onToggleSave}
                entryPoint="saved"
                imageLoading={index === 0 ? "eager" : "lazy"}
                keyword={settled}
              />
            </li>
          ),
        )}
      </ul>

      {/* 더 그릴 것이 있을 때만 자리를 둔다. 빈 자리 아래에 남으면 여백만 커진다. */}
      {hasNext ? <div ref={sentinel} className="h-10" /> : null}

      {current.items.length > removingIds.length && shown.length === 0 ? (
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
