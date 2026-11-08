"use client";

import type { ShelfProductInfoResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Skeleton } from "@poudy/design-system/skeleton";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { ProductImage } from "@/components/ui/ProductImage";
import { requestFeatureLogin } from "@/lib/analytics/feature-login";
import { similarProductsHref } from "@/lib/domain/similar-products";
import { useSimilarityShelf } from "@/lib/hooks/useSimilarityShelf";
import { rememberLoginReturn } from "@/lib/storage/login-return";

export function SimilarityShelf() {
  const { state, retry } = useSimilarityShelf();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const items = state.status === "ready" ? state.shelf.items : [];

  return (
    <section aria-labelledby="similarity-shelf-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="similarity-shelf-title" className="text-section font-bold text-text-primary">
          내 파우치 제품으로 찾기
        </h2>
        {items.length > 0 ? (
          <Button variant="ghost" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
            전체
          </Button>
        ) : null}
      </div>
      {state.status === "loading" ? (
        <div role="status" aria-label="내 파우치를 불러오는 중" className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} shape="card" className="h-28 w-24 shrink-0" />
          ))}
        </div>
      ) : null}
      {state.status === "signedOut" ? (
        <EmptyState
          title="내 파우치에서 바로 찾아보세요"
          description="로그인하면 파우치에 담은 제품을 고를 수 있어요."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                rememberLoginReturn();
                requestFeatureLogin("similar_shelf");
                router.push("/login");
              }}
            >
              로그인하기
            </Button>
          }
        />
      ) : null}
      {state.status === "adminSession" ? <AdminSessionNotice className="py-4" /> : null}
      {state.status === "error" ? (
        <ErrorState variant="section" onRetry={retry}>
          내 파우치를 불러오지 못했어요
        </ErrorState>
      ) : null}
      {state.status === "ready" && items.length === 0 ? (
        <EmptyState title="파우치에 담은 제품이 없어요" description="제품 이름을 검색해서 유사템을 찾아보세요." />
      ) : null}
      {items.length > 0 ? (
        <>
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {items.slice(0, 10).map(({ product }) => (
              <li key={product.id} className="w-24 shrink-0">
                <ShelfPreview product={product} />
              </li>
            ))}
          </ul>
          <BottomSheet open={open} onClose={() => setOpen(false)}>
            <BottomSheetHeader
              title="내 파우치 제품 선택"
              description="유사템을 찾을 기준 제품을 골라 주세요."
              onClose={() => setOpen(false)}
            />
            <BottomSheetBody>
              <ul className="flex flex-col pb-6">
                {items.map(({ product }) => (
                  <li key={product.id} className="border-b border-border last:border-b-0">
                    <ShelfOption
                      product={product}
                      onSelect={() => {
                        setOpen(false);
                        router.push(similarProductsHref(product.id));
                      }}
                    />
                  </li>
                ))}
              </ul>
            </BottomSheetBody>
          </BottomSheet>
        </>
      ) : null}
    </section>
  );
}

function ShelfPreview({ product }: { readonly product: ShelfProductInfoResponse }) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <Link
      href={similarProductsHref(product.id)}
      {...pressableProps}
      className="pressable fb-surface flex flex-col items-start gap-2 rounded-lg py-2"
    >
      <ProductImage src={product.imageUrl} size={80} />
      <span className="text-caption text-text-secondary">{product.brandName}</span>
      <span className="line-clamp-2 text-body-sm font-semibold text-text-primary">{product.name}</span>
    </Link>
  );
}

function ShelfOption({
  product,
  onSelect,
}: {
  readonly product: ShelfProductInfoResponse;
  readonly onSelect: () => void;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <button
      type="button"
      onClick={onSelect}
      {...pressableProps}
      className="pressable fb-bleed flex w-full items-center gap-3 py-3 text-left"
    >
      <ProductImage src={product.imageUrl} size={48} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption text-text-secondary">{product.brandName}</span>
        <span className="text-title font-medium text-text-primary">{product.name}</span>
      </span>
    </button>
  );
}
