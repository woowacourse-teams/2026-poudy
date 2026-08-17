"use client";

import type { ProductResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductCard } from "@/components/ui/ProductCard";
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

  if (current.loading) {
    return <p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>;
  }

  if (current.items.length === 0) return <EmptyState />;

  return (
    <main className="flex-1 px-4">
      <p className="py-3 text-[13px] text-text-secondary">
        저장한 제품 {current.items.length}개 · 이 브라우저에만 저장돼요
      </p>

      <ul className="divide-y divide-border">
        {current.items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} saved={isSaved(product.id)} onToggleSave={toggle} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function EmptyState() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <p className="text-[15px] font-semibold text-text-primary">아직 저장한 제품이 없어요</p>
      <p className="text-center text-[13px] text-text-secondary">
        마음에 드는 제품을 저장해 두면 여기에서 모아 볼 수 있어요.
      </p>
      <Link href="/search" className="mt-2 rounded-button bg-action px-5 py-3 text-[14px] font-bold text-action-text">
        제품 찾아보기
      </Link>
    </main>
  );
}
