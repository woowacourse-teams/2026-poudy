"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Badge } from "@poudy/design-system/badge";
import { Button } from "@poudy/design-system/button";
import { IconButton } from "@poudy/design-system/icon-button";

import { productImageSrc } from "./product-image-src";

import { ProductImage } from "@/components/ui/ProductImage";
import { isRated, ratingBadge, ratingSummary } from "@/lib/domain/shelf";

type ShelfProductRowProps = {
  readonly item: ShelfProductResponse;
  /** 평가 전 행의 '평가하기'. 평가 시트를 연다. */
  readonly onRate?: () => void;
  /** 더보기(⋯). 제품 메뉴를 연다. 소개 페이지의 미리보기처럼 누를 수 없는 행은 비운다. */
  readonly onOpenMenu?: () => void;
  readonly loading?: "eager" | "lazy";
};

/**
 * 선반 제품 행(명세 APP · 선반 제품 행 · 평가 완료 · 평가 전).
 * 썸네일 오른쪽 아래에 평가 배지를 겹치고, 평가를 하나도 남기지 않았으면 오른쪽에 '평가하기'를 둔다.
 */
export function ShelfProductRow({ item, onRate, onOpenMenu, loading = "lazy" }: ShelfProductRowProps) {
  const { product, rating } = item;
  const badge = ratingBadge(rating);
  const summary = ratingSummary(rating);

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="relative flex size-19 shrink-0 items-center justify-center rounded-2xl bg-surface">
        <ProductImage
          src={productImageSrc(product.imageUrl)}
          alt=""
          size={56}
          loading={loading}
          className="size-14 object-contain mix-blend-multiply"
        />
        {badge ? <Badge variant="rating" rating={badge} className="absolute right-1 bottom-1" /> : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-caption font-medium text-text-secondary">{product.brandName}</p>
          <p className="line-clamp-2 text-title font-medium text-text-primary">{product.name}</p>
        </div>
        {summary ? <p className="pt-0.5 text-caption text-text-secondary">{summary}</p> : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-0.5">
        {!isRated(rating) && onRate ? (
          <Button variant="outline" onClick={onRate} aria-label={`${product.name} 평가하기`}>
            평가하기
          </Button>
        ) : null}
        {onOpenMenu ? (
          <IconButton
            label={`${product.name} 메뉴`}
            onClick={onOpenMenu}
            // TODO(#729): 더보기 아이콘(Tabler dots-vertical). Icon 부품이 들어오면 넣는다.
            icon={null}
          />
        ) : null}
      </div>
    </div>
  );
}
