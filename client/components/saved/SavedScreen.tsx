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
import { isSignedOut } from "@/lib/api/member";
import { fetchSavedProducts } from "@/lib/api/saved-products";
import { useInfiniteScroll } from "@/lib/hooks/useInfiniteScroll";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";
import { reloadSavedProducts } from "@/lib/storage/saved-products";

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

function SignInNotice() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <Icon name="bookmark" size={28} className="text-text-secondary" />
      <p className="text-[15px] font-bold text-text-primary">로그인하면 제품을 저장할 수 있어요</p>
      <p className="text-[12px] text-text-secondary">저장한 제품은 다른 기기에서도 그대로 볼 수 있어요.</p>
      <Link
        href="/login"
        className="mt-2 flex h-11 items-center rounded-button bg-action px-5 text-[14px] font-bold text-action-text"
      >
        로그인하기
      </Link>
    </main>
  );
}

/** S07 저장함. 저장한 제품과 표시 정보를 회원 저장함 API 에서 한 번에 받는다. */
export function SavedScreen() {
  const { status: savedStatus, save, unsave } = useSavedProducts();
  const signedOut = savedStatus === "signedOut";
  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<readonly ProductResponse[]>([]);
  const [removedIds, setRemovedIds] = useState<readonly number[]>([]);
  const [retry, setRetry] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [composing, setComposing] = useState(false);
  const [settled, setSettled] = useState("");
  const [sort, setSort] = useState<SavedSort>("SAVED_DESC");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (signedOut) return;

    let cancelled = false;
    fetchSavedProducts()
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isSignedOut(error)) {
          void reloadSavedProducts();
          return;
        }
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [signedOut, retry]);

  const remove = (productId: number) => {
    if (!unsave(productId)) return;
    setRemovedIds((previous) => [...previous, productId]);
    track("product_unsaved", { product_id: productId, save_source: "saved" });
  };

  const restore = (productId: number) => {
    if (!save(productId)) return;
    setRemovedIds((previous) => previous.filter((id) => id !== productId));
    track("product_saved", { product_id: productId, save_source: "saved" });
  };

  const onToggleSave = (productId: number) => {
    if (removedIds.includes(productId)) {
      restore(productId);
      return;
    }
    remove(productId);
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

  if (status === "loading") {
    return (
      <main className="flex-1 px-4">
        <p className="py-14 text-center text-[13px] text-text-secondary">불러오는 중…</p>
      </main>
    );
  }

  if (status === "error") {
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
            setStatus("loading");
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
      {savedCount > 0 && (
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
          <SortHeader
            total={ordered.filter((product) => !removedIds.includes(product.id)).length}
            sort={sort}
            onChangeSort={setSort}
            options={SAVED_SORT_OPTIONS}
          />
        </>
      )}

      {items.length === 0 && (
        <div className="flex flex-1 flex-col py-4">
          <EmptyNotice
            icon="bookmark"
            image={{ src: "/images/empty-states/no-saved-products-watermark.png", size: 170, loading: "eager" }}
            title="아직 저장한 제품이 없어요"
            className="flex-1"
          />
        </div>
      )}

      <ul data-private className="divide-y divide-divider">
        {shown.map((product, index) => {
          const card = (
            <ProductCard
              product={product}
              saved={!removedIds.includes(product.id)}
              onToggleSave={onToggleSave}
              entryPoint="saved"
              imageLoading={imageLoadingOf(index)}
              keyword={settled}
            />
          );
          if (removedIds.includes(product.id)) {
            return (
              <li key={product.id}>
                <UndoRow productName={product.name} onUndo={() => restore(product.id)}>
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
        <p className="py-10 text-center text-[13px] text-text-secondary">검색 결과가 없어요.</p>
      )}

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
