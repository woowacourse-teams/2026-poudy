"use client";

import type { ShelfProductResponse } from "@poudy/api/api.zod";
import { Badge } from "@poudy/design-system/badge";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { IconButton } from "@poudy/design-system/icon-button";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { ProductImage } from "@/components/ui/ProductImage";
import { isRated, ratingBadge, ratingSummary } from "@/lib/domain/shelf";

type ShelfProductRowProps = {
  readonly item: ShelfProductResponse;
  /** 평가 전 행의 '평가하기'. 평가 시트를 연다. */
  readonly onRate?: () => void;
  /** 더보기(⋯). 제품 메뉴를 연다. 소개 페이지의 미리보기처럼 누를 수 없는 행은 비운다. */
  readonly onOpenMenu?: () => void;
  readonly loading?: "eager" | "lazy";
  /** 썸네일과 이름을 눌러 제품 상세로 갈지. 소개 페이지의 미리보기는 끈다. */
  readonly linked?: boolean;
};

/**
 * 선반 제품 행(명세 APP · 선반 제품 행 · 평가 완료 · 평가 전).
 * 썸네일 오른쪽 아래에 평가 배지를 겹치고, 평가를 하나도 남기지 않았으면 오른쪽에 '평가하기'를 둔다.
 *
 * 썸네일과 이름은 제품 상세로 가는 링크다. 오른쪽 버튼들은 링크 밖에 두어 링크 안에 버튼이 들어가지 않게 한다.
 */
export function ShelfProductRow({ item, onRate, onOpenMenu, loading = "lazy", linked = false }: ShelfProductRowProps) {
  const { product, rating } = item;
  const badge = ratingBadge(rating);
  const summary = ratingSummary(rating);
  const { pressableProps } = usePressable();
  const content = (
    <>
      <div className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-surface">
        <ProductImage src={product.imageUrl} size={48} loading={loading} className="mix-blend-multiply" />
        {badge ? <Badge variant="rating" rating={badge} className="absolute right-1 bottom-1" /> : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-caption font-medium text-text-secondary">{product.brandName}</p>
          <p data-product-name className="line-clamp-2 text-title font-medium break-keep text-text-primary">
            {product.name}
          </p>
        </div>
        {summary ? <p className="pt-0.5 text-caption text-text-secondary">{summary}</p> : null}
      </div>
    </>
  );

  /*
   * 글자를 키워 이름 칸이 좁아지면 평가하기·메뉴를 아래 줄 오른쪽으로 내려, 이름의 낱말이 갈라지지 않게 한다.
   * 행 폭(@container)이 '썸네일과 간격 80 + 이름 칸 + 오른쪽 행동'보다 좁으면 제품 정보가 한 줄을 다 차지한다.
   * 이름 칸은 메뉴만 있으면 7em(긴 낱말 '아토베리어365'가 한 줄에 드는 폭), 평가하기도 있으면 4em 이다.
   * 평가하기가 있는 행을 7em 으로 잡으면 320 화면의 기본 배율에서부터 아래 줄로 내려가 4em 에 둔다.
   * 오른쪽 행동은 평가하기(글자 3.5em + 안쪽 여백 24)와 간격 4, 메뉴(보이는 칸 28)로, 평가하기가 없으면 메뉴만 남는다. 기본 배율에서는 320 폭에서도 한 줄이다.
   */
  const showRate = !isRated(rating) && onRate !== undefined;
  // 소개 페이지의 미리보기처럼 오른쪽 행동이 없는 행은 제품 정보가 늘 한 줄을 다 쓴다.
  const hasActions = showRate || onOpenMenu !== undefined;
  const oneLine =
    (!hasActions && "basis-full") ||
    (showRate && "basis-full @min-[calc(152px_+_7.5em)]:basis-0") ||
    "basis-full @min-[calc(124px_+_7em)]:basis-0";

  return (
    <div className="@container">
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 py-2">
        {linked ? (
          <Link
            href={`/products/${product.id}?from=shelf`}
            {...pressableProps}
            className={cn("pressable fb-underline flex min-w-0 grow items-center gap-4", oneLine)}
          >
            {content}
          </Link>
        ) : (
          <div className={cn("flex min-w-0 grow items-center gap-4", oneLine)}>{content}</div>
        )}

        {hasActions ? (
          // 메뉴는 보이는 칸 28 의 오른쪽 끝에 아이콘을 붙여 행의 오른쪽 내용 선에 맞추고, 평가하기와는 4 띄운다(S52).
          <div className="flex shrink-0 items-center justify-end gap-1">
            {showRate ? (
              <Button variant="outline" onClick={onRate} aria-label={`${product.name} 평가하기`}>
                평가하기
              </Button>
            ) : null}
            {onOpenMenu ? (
              <IconButton
                align="end"
                label={`${product.name} 메뉴`}
                onClick={onOpenMenu}
                icon={<Icon name="dots-vertical" size={20} className="text-text-secondary" />}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
