"use client";

import type {
  ProductDetailResponse,
  ProductSimilarityResponse,
  ProductSimilaritySort,
  SimilarProductResponse,
} from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { ToggleChip, ToggleGroup } from "@poudy/design-system/toggle-chip";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { useTrackedView } from "@/components/analytics/useTrackedView";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductFeatureContext } from "@/lib/analytics/events";
import { featureFlowFor } from "@/lib/analytics/feature-flow";
import { track } from "@/lib/analytics/track";
import { formatCount, formatPrice, formatUnitPrice, formatVolume } from "@/lib/domain/format";
import { partHref, partOrder } from "@/lib/domain/product-parts";
import {
  SIMILAR_PRODUCTS_LIMIT,
  similarProductsHref,
  similarUnitPrice,
  unitPriceDifference,
} from "@/lib/domain/similar-products";

type Props = {
  readonly product: ProductDetailResponse;
  readonly response: ProductSimilarityResponse | null;
  readonly sort: ProductSimilaritySort;
};

export function SimilarProductsResult({ product, response, sort }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = response?.items.slice(0, SIMILAR_PRODUCTS_LIMIT) ?? [];
  const partId = response?.partId ?? product.selectedPart?.id;
  const flow = featureFlowFor("similar_products", product.id);
  const context = { ...flow, base_product_id: product.id, base_part_id: partId };
  useTrackedView(
    "similar_results_viewed",
    {
      ...context,
      sort,
      result_count: items.length,
      cheaper_count: items.filter((item) => item.unitPriceComparison === "CHEAPER").length,
      price_comparable_count: items.filter(
        (item) => item.unitPriceComparison != null && item.unitPriceComparison !== "UNAVAILABLE",
      ).length,
      calculated: response?.calculated ?? false,
    },
    { key: `${product.id}:${partId}:${sort}`, enabled: response !== null },
  );
  const changeSort = (next: ProductSimilaritySort) => {
    if (next === sort) return;
    track("sort_applied", { ...flow, sort: next, surface: "similar_products", base_product_id: product.id });
    startTransition(() => router.replace(similarProductsHref(product.id, partId, next), { scroll: false }));
  };

  return (
    <div className={cn("flex flex-col gap-6", items.length > 0 ? "pb-inquiry" : "pb-10")}>
      <SourceProduct product={product} />
      <section className="flex flex-col gap-3" aria-busy={pending}>
        <h2 className="text-section font-bold text-text-primary">
          성분이 유사한 제품{response ? ` ${formatCount(items.length)}` : ""}
        </h2>
        <ToggleGroup aria-label="유사템 정렬">
          <ToggleChip
            pressed={sort === "UNIT_PRICE_ASC"}
            disabled={pending}
            onPressedChange={() => changeSort("UNIT_PRICE_ASC")}
          >
            저렴한 순
          </ToggleChip>
          <ToggleChip
            pressed={sort === "SIMILARITY"}
            disabled={pending}
            onPressedChange={() => changeSort("SIMILARITY")}
          >
            성분 유사한 순
          </ToggleChip>
        </ToggleGroup>
        <p className="text-caption text-text-secondary">
          성분이 비슷한 상위 10개 안에서 비교해요. 가격은 대표 용량 기준이에요.
        </p>
        <span role="status" className="sr-only">
          {pending ? "정렬하고 있어요" : ""}
        </span>
        {response === null ? (
          <ErrorState variant="section" onRetry={() => router.refresh()}>
            유사템을 불러오지 못했어요
          </ErrorState>
        ) : items.length === 0 ? (
          <EmptyState title="아직 비교할 유사템이 없어요" description="다른 제품으로 찾아보세요." />
        ) : (
          <ul className="flex flex-col">
            {items.map((item, index) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <ResultRow product={item} context={context} sort={sort} position={index + 1} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SourceProduct({ product }: { readonly product: ProductDetailResponse }) {
  const variant = product.variants[0];
  return (
    <section aria-label="기준 제품" className="flex items-center gap-3 rounded-xl bg-surface p-3">
      <ProductImage src={product.imageUrl} size={64} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-caption text-text-secondary">기준 제품 · {product.brand.name}</p>
        <p className="text-title font-semibold text-text-primary">{product.name}</p>
        {product.productParts.length > 1 && product.selectedPart ? (
          <p className="text-caption text-text-secondary">
            비교 구성품:{" "}
            {product.selectedPart.name ??
              `${partOrder(product.productParts.findIndex((part) => part.id === product.selectedPart?.id))} 구성품`}
          </p>
        ) : null}
        {variant ? (
          <>
            <p className="text-caption text-text-secondary">
              {formatVolume(variant)} · {formatPrice(variant.price)}
            </p>
            <p className="text-body-sm font-bold text-text-primary">
              {formatUnitPrice(variant.price, variant) ?? "단위 가격 정보 없음"}
            </p>
          </>
        ) : (
          <p className="text-caption text-text-secondary">가격 정보 없음</p>
        )}
      </div>
    </section>
  );
}

function ResultRow({
  product,
  context,
  sort,
  position,
}: {
  readonly product: SimilarProductResponse;
  readonly context: ProductFeatureContext & { readonly base_product_id: number };
  readonly sort: ProductSimilaritySort;
  readonly position: number;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  const difference = unitPriceDifference(product);
  return (
    <Link
      href={partHref(product.id, product.partId)}
      entryPoint="similar_finder"
      featureContext={{ ...context, target_part_id: product.partId }}
      onNavigate={() =>
        track("similar_product_selected", {
          ...context,
          product_id: product.id,
          target_part_id: product.partId,
          position,
          sort,
          unit_price_comparison: product.unitPriceComparison,
          unit_price_difference_percent: product.unitPriceDifferencePercent,
        })
      }
      {...pressableProps}
      className="pressable fb-bleed flex items-center gap-3 py-4"
    >
      <ProductImage src={product.imageUrl} size={64} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-caption text-text-secondary">{product.brand.name}</span>
        <span className="text-title font-semibold text-text-primary">{product.name}</span>
        <span className="text-caption text-text-secondary">
          {formatVolume(product)} · {formatPrice(product.price)}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-body-sm font-bold text-text-primary">
            {similarUnitPrice(product) ?? "단위 가격 정보 없음"}
          </span>
          <span
            className={cn(
              "text-caption font-semibold",
              difference.cheaper ? "text-success-text" : "text-text-secondary",
            )}
          >
            {difference.text}
          </span>
        </span>
      </span>
    </Link>
  );
}
