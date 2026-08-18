"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { ProductCard } from "@/components/ui/ProductCard";
import { SearchField } from "@/components/ui/SearchField";
import { track } from "@/lib/analytics/track";
import { fetchStorage } from "@/lib/api/products";
import { useSavedProducts } from "@/lib/hooks/useSavedProducts";

type State = {
  readonly key: string;
  readonly items: readonly ProductResponse[];
  readonly loading: boolean;
};

/** S07 저장함. 목록은 브라우저가 들고 표시 정보만 서버에서 채운다. */
export function SavedScreen() {
  const { savedIds, isSaved, toggle } = useSavedProducts();
  const key = savedIds.join(",");
  const [keyword, setKeyword] = useState("");

  // 저장 목록이 비면 요청할 것이 없으므로 처음부터 끝난 상태로 둔다.
  const [state, setState] = useState<State>({ key, items: [], loading: Boolean(key) });
  const current = state.key === key ? state : { key, items: key ? state.items : [], loading: Boolean(key) };
  if (state.key !== key) setState(current);

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    fetchStorage(key.split(",").map(Number))
      .then((response) => {
        if (controller.signal.aborted) return;
        setState((previous) =>
          previous.key === key ? { ...previous, items: response.items, loading: false } : previous,
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState((previous) => (previous.key === key ? { ...previous, loading: false } : previous));
      });

    return () => controller.abort();
  }, [key]);

  const onToggleSave = (productId: number) => {
    toggle(productId);
    track(isSaved(productId) ? "product_unsaved" : "product_saved", {
      product_id: productId,
      save_source: "saved",
    });
  };

  // 저장한 제품 안에서만 찾는다. 서버에 다시 묻지 않는다.
  const shown = keyword.trim()
    ? current.items.filter((product) =>
        `${product.name} ${product.brand.name}`.toLowerCase().includes(keyword.trim().toLowerCase()),
      )
    : current.items;

  if (current.loading) {
    return <p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>;
  }

  return (
    <main className="flex-1 px-4">
      <div className="flex items-center justify-between py-3">
        <p className="flex items-center gap-1 text-[11px] text-text-secondary">
          <Icon name="info" size={13} />이 브라우저에 저장돼요
        </p>
        <p className="text-[13px] font-bold text-text-primary">총 {current.items.length}개</p>
      </div>

      {current.items.length > 0 ? (
        <div className="flex items-center gap-2 pb-2">
          <div className="flex-1">
            <SearchField
              value={keyword}
              onChange={setKeyword}
              placeholder="저장한 제품 검색"
              label="저장한 제품 검색"
            />
          </div>
          <p className="flex h-12 shrink-0 items-center gap-1 rounded-xl bg-surface px-3.5 text-[13px] font-semibold text-text-primary">
            최근 저장순
            <Icon name="chevron-down" size={14} className="text-text-secondary" />
          </p>
        </div>
      ) : null}

      {current.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14">
          <Icon name="bookmark" size={28} className="text-text-secondary" />
          <p className="text-[15px] font-bold text-text-primary">저장한 제품이 없어요</p>
          <p className="text-center text-[12px] text-text-secondary">
            마음에 드는 제품을 저장해 두면 여기에서 모아 볼 수 있어요
          </p>
        </div>
      ) : null}

      <ul className="divide-y divide-border">
        {shown.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={onToggleSave} />
          </li>
        ))}
      </ul>

      {current.items.length > 0 && shown.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-text-secondary">검색 결과가 없어요.</p>
      ) : null}

      <Link href="/search" className="mt-2 mb-6 flex items-center gap-3 rounded-xl bg-surface p-3.5">
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
