"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { SearchField } from "@poudy/design-system/search-field";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { ProductCard } from "@/components/ui/ProductCard";
import { SEARCH_KEYWORD_MAX_LENGTH } from "@/components/ui/SearchField";
import type { SortOption } from "@/components/ui/SortDropdown";
import { SortHeader } from "@/components/ui/SortHeader";
import { StickyBar } from "@/components/ui/StickyBar";
import { track } from "@/lib/analytics/track";
import { isAdminSession, isSignedOut } from "@/lib/api/member";
import { fetchSavedProducts } from "@/lib/api/saved-products";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { rememberLoginReturn } from "@/lib/storage/login-return";
import { getSavedProductsSnapshot, reloadSavedProducts, type SaveResult } from "@/lib/storage/saved-products";

type Status = "loading" | "error" | "ready";

type SavedSort = "SAVED_DESC" | "NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC";

const SAVED_SORT_OPTIONS: readonly SortOption<SavedSort>[] = [
  { value: "SAVED_DESC", label: "최근 저장순" },
  { value: "NAME_ASC", label: "이름 오름차순" },
  { value: "NAME_DESC", label: "이름 내림차순" },
  { value: "PRICE_ASC", label: "가격 낮은순" },
  { value: "PRICE_DESC", label: "가격 높은순" },
];

const sortProducts = (products: readonly ProductResponse[], sort: SavedSort): readonly ProductResponse[] => {
  if (sort === "SAVED_DESC") return products;
  if (sort === "NAME_ASC") return products.toSorted((a, b) => a.name.localeCompare(b.name, "ko-KR"));
  if (sort === "NAME_DESC") return products.toSorted((a, b) => b.name.localeCompare(a.name, "ko-KR"));
  if (sort === "PRICE_ASC") return products.toSorted((a, b) => a.price - b.price);
  return products.toSorted((a, b) => b.price - a.price);
};

const PAGE_SIZE = 20;

const imageLoadingOf = (index: number): "eager" | "lazy" => {
  if (index === 0) return "eager";
  return "lazy";
};

const matchesKeyword = (product: ProductResponse, keyword: string): boolean =>
  `${product.name} ${product.brand.name}`.toLowerCase().includes(keyword.toLowerCase());

/**
 * 저장을 푼 자리(S55d-2). 카드를 치우지 않고 그 자리를 회색 칸으로 바꾼다.
 *
 * 썸네일만 흑백·흐림으로 비쳐 어느 제품인지 알아보게 하고, 안내와 흰 '되돌리기' 버튼만 또렷하게 둔다.
 * 자리와 높이가 카드 그대로라 아래 목록이 밀려 올라오지 않는다. 되돌리기를 목록 안에 두어 어느 제품을
 * 되돌리는지 알 수 있게 한다. 화면 아래 뜨는 알림은 여러 개를 잇달아 풀면 무엇을 되돌리는지 흐려진다.
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
    <div className="relative isolate overflow-hidden rounded-lg bg-surface">
      {/* 제품 사진의 흰 바탕이 회색 칸 위에 밝은 네모로 뜨지 않게 바탕에 섞는다. */}
      <div
        aria-hidden="true"
        className="pointer-events-none opacity-(--removed-opacity) mix-blend-multiply blur-xs grayscale transition duration-(--duration-base) ease-out starting:opacity-100 starting:blur-none starting:grayscale-0"
      >
        {children}
      </div>

      {/*
        카드가 되돌리기 칸으로 바뀌는 순간을 불투명도로만 잇는다(MOTION M02). 자리는 그대로라 움직임이 필요 없고,
        불투명도만 바꾸므로 동작 줄이기에서도 그대로 둔다.
      */}
      <div
        role="status"
        className="absolute inset-y-0 right-0 left-21.5 flex items-center gap-3 bg-surface pr-3 pl-2 transition-opacity duration-(--duration-base) ease-out starting:opacity-0"
      >
        <p className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body leading-snug font-semibold text-text-primary">{productName}</span>
          <span className="text-caption text-text-secondary">위시리스트에서 뺐어요</span>
        </p>
        <Button
          variant="outline"
          onClick={onUndo}
          aria-label={`${productName} 저장 되돌리기`}
          leadingIcon={<Icon name="arrow-back-up" size={16} scalable />}
          className="shrink-0"
        >
          되돌리기
        </Button>
      </div>
    </div>
  );
}

/** 위시리스트 목록의 마지막 자리(APP · 위시리스트 더 둘러보기 행). 제품 카드와 같은 격자로 이어진다. */
function BrowseMoreRow() {
  const { pressableProps } = usePressable();

  return (
    <Link
      href="/search/products"
      {...pressableProps}
      className="pressable fb-surface flex items-center gap-3 border-t border-border py-3"
    >
      <span className="flex size-20 shrink-0 items-center justify-center">
        <span className="flex size-15 items-center justify-center rounded-lg border border-border-strong bg-background">
          <Icon name="search" size={20} className="text-text-secondary" />
        </span>
      </span>
      <span className="min-w-0 flex-1 text-body leading-snug font-semibold text-text-primary">
        다른 제품도 둘러보기
      </span>
      <span className="flex size-11 shrink-0 items-center justify-center">
        <Icon name="chevron-right" size={20} scalable className="text-text-muted" />
      </span>
    </Link>
  );
}

function SignInNotice() {
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col px-gutter">
      <EmptyState
        icon={<Icon name="bookmark" size={28} />}
        title="로그인하면 제품을 저장할 수 있어요"
        description="저장한 제품은 다른 기기에서도 그대로 볼 수 있어요."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              rememberLoginReturn();
              router.push("/login");
            }}
          >
            로그인하기
          </Button>
        }
        className="flex-1"
      />
    </main>
  );
}

/** 처음 불러오는 동안 찾는 칸과 제품 행의 자리(FEEDBACK F02). 높이를 실제와 맞춰 내용이 와도 아래가 밀리지 않는다. */
function SavedSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col px-gutter">
      <div className="pt-3 pb-2">
        <Skeleton shape="panel" className="h-12 w-full" />
      </div>
      <div className="flex h-11 items-center">
        <Skeleton shape="line" size={13} className="w-12" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex gap-3 py-4">
            <Skeleton shape="box" className="size-20" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton shape="line" size={12} className="w-16" />
              <Skeleton shape="line" size={16} className="w-3/4" />
              <Skeleton shape="line" size={13} className="w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 위시리스트(S55d). 저장한 제품과 표시 정보를 회원 위시리스트 API 에서 한 번에 받는다. */
export function SavedScreen({
  empty,
}: {
  /** 위시리스트가 비었을 때 그릴 빈 상태(S55d-1, FEEDBACK F03). 경로 옆 `app/my-page/wishlist/empty.tsx` 의 것을 넘긴다. */
  readonly empty: React.ReactNode;
}) {
  const { status: savedStatus, save, unsave } = useSavedProducts();
  const signedOut = savedStatus === "signedOut";
  const adminSession = savedStatus === "adminSession";
  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<readonly ProductResponse[]>([]);
  const [removedIds, setRemovedIds] = useState<readonly number[]>([]);
  const pendingChanges = useRef(new Map<number, Promise<SaveResult>>());
  const [retry, setRetry] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [composing, setComposing] = useState(false);
  const [settled, setSettled] = useState("");
  const [sort, setSort] = useState<SavedSort>("SAVED_DESC");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const showSkeleton = useDelayedFlag(status === "loading" && !signedOut && !adminSession);

  useEffect(() => {
    if (signedOut || adminSession) return;

    let cancelled = false;
    fetchSavedProducts()
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSignedOut(error) || isAdminSession(error)) {
          void reloadSavedProducts();
          return;
        }
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [signedOut, adminSession, retry]);

  const changeSaved = (productId: number, removed: boolean) => {
    const request = removed ? unsave(productId) : save(productId);
    if (!request) return;
    pendingChanges.current.set(productId, request);
    setRemovedIds((previous) =>
      removed ? [...previous.filter((id) => id !== productId), productId] : previous.filter((id) => id !== productId),
    );
    track(removed ? "product_unsaved" : "product_saved", { product_id: productId, save_source: "saved" });
    void request.then(async (result) => {
      if (result === "failed") await reloadSavedProducts();
      if (pendingChanges.current.get(productId) !== request) return;
      pendingChanges.current.delete(productId);
      if (result !== "failed") return;
      const restored = getSavedProductsSnapshot();
      const saved = restored.status === "ready" ? restored.ids.includes(productId) : removed;
      setRemovedIds((previous) =>
        saved ? previous.filter((id) => id !== productId) : [...previous.filter((id) => id !== productId), productId],
      );
    });
  };

  const onToggleSave = (productId: number) => {
    changeSaved(productId, !removedIds.includes(productId));
  };

  if (!composing && settled !== keyword) setSettled(keyword);

  const query = settled.trim();
  const matched = items.filter((product) => !query || matchesKeyword(product, query));
  const ordered = sortProducts(matched, sort);
  const shown = ordered.slice(0, visible);
  const hasNext = shown.length < ordered.length;
  const savedCount = items.length - removedIds.length;

  const [shownKey, setShownKey] = useState(`${settled}|${sort}`);
  if (shownKey !== `${settled}|${sort}`) {
    setShownKey(`${settled}|${sort}`);
    setVisible(PAGE_SIZE);
  }

  const showMore = useCallback(() => setVisible((count) => count + PAGE_SIZE), []);
  const sentinel = useInfiniteScroll(hasNext, showMore);

  if (signedOut) return <SignInNotice />;

  if (adminSession) {
    return (
      <AdminSessionNotice className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-14 text-center" />
    );
  }

  if (status === "loading") {
    return (
      <main aria-busy="true" className="flex flex-1 flex-col pb-6">
        {showSkeleton ? <SavedSkeleton /> : null}
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="alert-circle" size={28} />}
          title="저장한 제품을 불러오지 못했어요"
          description={"잠시 후 다시 시도해 주세요.\n저장한 목록은 그대로 있어요."}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setStatus("loading");
                setRetry((previous) => previous + 1);
              }}
            >
              다시 시도
            </Button>
          }
          className="flex-1"
        />
      </main>
    );
  }

  if (items.length === 0) {
    return <main className="flex flex-1 flex-col pb-6">{empty}</main>;
  }

  return (
    <main className="flex flex-1 flex-col pb-6">
      {savedCount > 0 && (
        <>
          {/* 하위 상단 내비(44) 아래에 붙는다. */}
          <StickyBar stuckAt={44} className="sticky top-11 z-20 bg-background px-gutter pt-3 pb-2">
            <SearchField
              value={keyword}
              onChange={setKeyword}
              onChangeComposing={setComposing}
              maxLength={SEARCH_KEYWORD_MAX_LENGTH}
              placeholder="위시리스트에서 찾기"
              label="위시리스트에서 찾기"
            />
          </StickyBar>
          <div className="px-gutter">
            <SortHeader
              total={ordered.filter((product) => !removedIds.includes(product.id)).length}
              sort={sort}
              onChangeSort={setSort}
              options={SAVED_SORT_OPTIONS}
            />
          </div>
        </>
      )}

      <div className="px-gutter">
        <ul data-private>
          {shown.map((product, index) => {
            const card = (
              <ProductCard
                product={product}
                save={{ saved: !removedIds.includes(product.id), onToggle: onToggleSave }}
                entryPoint="saved"
                imageLoading={imageLoadingOf(index)}
                keyword={settled}
              />
            );
            if (removedIds.includes(product.id)) {
              return (
                <li key={product.id}>
                  <UndoRow productName={product.name} onUndo={() => changeSaved(product.id, false)}>
                    {card}
                  </UndoRow>
                </li>
              );
            }
            return <li key={product.id}>{card}</li>;
          })}
        </ul>

        {hasNext && <div ref={sentinel} className="h-10" />}

        {savedCount > 0 && shown.length === 0 && (
          <p className="py-10 text-center text-body-sm text-text-secondary">검색 결과가 없어요.</p>
        )}

        <BrowseMoreRow />
      </div>
    </main>
  );
}
