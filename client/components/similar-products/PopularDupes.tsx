"use client";

import { EmptyState } from "@poudy/design-system/empty-state";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { ProductImage } from "@/components/ui/ProductImage";
import { formatNumber, formatPrice } from "@/lib/domain/format";
import type { PopularDupe } from "@/lib/domain/popular-dupes";
import { similarProductsHref } from "@/lib/domain/similar-products";

export function PopularDupes({ items }: { readonly items: readonly PopularDupe[] }) {
  return (
    <section aria-labelledby="popular-dupes-title" className="flex flex-col gap-3">
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

function PopularDupeRow({ item: { source, alternative, savingPercent } }: { readonly item: PopularDupe }) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <Link
      href={similarProductsHref(source.id, source.partId)}
      {...pressableProps}
      className="pressable fb-bleed flex items-center gap-3 py-4"
    >
      <span className="flex shrink-0 items-center -space-x-2">
        <ProductImage src={source.imageUrl} size={40} />
        <ProductImage src={alternative.imageUrl} size={48} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption text-text-secondary">{source.name} 대신</span>
        <span className="text-title font-semibold text-text-primary">
          {alternative.brandName} {alternative.name}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-caption">
          <span className="text-text-secondary">
            {source.volumeUnit}당 {formatPrice(source.unitPrice)} → {formatPrice(alternative.unitPrice)}
          </span>
          <span className="font-semibold text-success-text">{formatNumber(savingPercent)}% 저렴</span>
        </span>
      </span>
    </Link>
  );
}
