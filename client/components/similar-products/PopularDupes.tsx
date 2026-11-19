"use client";

import { EmptyState } from "@poudy/design-system/empty-state";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { ProductImage } from "@/components/ui/ProductImage";
import { selectSimilarSource } from "@/lib/analytics/similar-products";
import { formatPrice } from "@/lib/domain/format";
import type { PopularDupe } from "@/lib/domain/popular-dupes";
import { similarProductsHref, wholePercent } from "@/lib/domain/similar-products";

/**
 * 요즘 많이 찾는 저렴이(명세 S271 U7JVu). 제목 아래 간격은 두지 않는다. 행 위의 16 이 그 간격을 만든다.
 * 데이터는 아직 고정 조합이다(#1037 의 조회수 API 전).
 */
export function PopularDupes({ items }: { readonly items: readonly PopularDupe[] }) {
  return (
    <section aria-labelledby="popular-dupes-title" className="flex flex-col">
      <h2 id="popular-dupes-title" className="text-section font-bold text-text-primary">
        요즘 많이 찾는 저렴이
      </h2>
      {items.length > 0 ? (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={`${item.source.partId}-${item.alternative.partId}`}
              className="border-b border-border last:border-b-0"
            >
              <PopularDupeRow item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="아직 추천할 저렴이가 없어요" description="제품을 검색해서 유사템을 찾아보세요." />
      )}
    </section>
  );
}

/**
 * 저렴이 행(명세 S271 MFtfa). 58 칸 안에 기준 제품(32, 흐리게, 왼쪽 위)과 대체 제품(52, 오른쪽 아래)을 겹치고, 사진과 글 사이는 12 띄운다.
 * 가격 줄은 '절약률 · 대체 제품 단가 · 취소선 기준 단가'이고, 결과 화면 행과 같은 12/700 이다(T02 · T05).
 */
function PopularDupeRow({ item: { source, alternative, savingPercent } }: { readonly item: PopularDupe }) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <Link
      href={similarProductsHref(source.id, source.partId)}
      onNavigate={() => selectSimilarSource(source.id, "popular_dupe", source.partId)}
      {...pressableProps}
      className="pressable fb-bleed flex items-center gap-3 py-4"
    >
      {/* 사진 크기 32·52 는 고정 칸 표(IMAGE P02) 밖이라 폭을 직접 정하는 칸으로 그린다. */}
      <span className="relative size-14.5 shrink-0">
        <span className="absolute top-0 left-0 opacity-45">
          <ProductImage src={source.imageUrl} size={32} sizes="32px" className="size-8" />
        </span>
        <span className="absolute right-0 bottom-0">
          <ProductImage src={alternative.imageUrl} size={52} sizes="52px" className="size-13" />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-caption text-text-secondary">
          {source.brandName} {source.name} 대신
        </span>
        <span className="line-clamp-2 text-title font-semibold text-text-primary">
          {alternative.brandName} {alternative.name}
        </span>
        <span className="flex flex-wrap items-center gap-1 pt-0.5 text-caption font-bold tabular-nums">
          <span className="text-success-text">
            {wholePercent(savingPercent)}
            <span className="sr-only"> 저렴</span>
          </span>
          <span className="text-text-primary">
            {alternative.volumeUnit}당 {formatPrice(Math.round(alternative.unitPrice))}
          </span>
          <s className="font-normal text-text-secondary">
            <span className="sr-only">기준 제품 </span>
            {formatPrice(Math.round(source.unitPrice))}
          </s>
        </span>
      </span>
    </Link>
  );
}
