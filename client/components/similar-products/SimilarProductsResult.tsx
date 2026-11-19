"use client";

import type { ProductDetailResponse, ProductSimilaritySort } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Tag } from "@poudy/design-system/tag";
import { ToggleChip, ToggleGroup } from "@poudy/design-system/toggle-chip";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { useTrackedView } from "@/components/analytics/useTrackedView";
import { DirectoryLinkButton } from "@/components/directory/DirectoryLinkButton";
import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductFeatureContext } from "@/lib/analytics/events";
import { featureFlowFor } from "@/lib/analytics/feature-flow";
import { track } from "@/lib/analytics/track";
import type { ProductSimilarityWithGroups, SimilarProductWithGroups } from "@/lib/api/shared-ingredient-groups";
import { formatCount, formatNumber, formatPrice, formatUnitPrice, formatVolume, unitPrice } from "@/lib/domain/format";
import { partHref, partOrder } from "@/lib/domain/product-parts";
import {
  SIMILAR_PRODUCTS_LIMIT,
  SIMILAR_PRODUCTS_PATH,
  similarityFootnote,
  similarProductsHref,
  similarUnitPrice,
  unitPriceDifference,
} from "@/lib/domain/similar-products";

type Props = {
  readonly product: ProductDetailResponse;
  readonly response: ProductSimilarityWithGroups | null;
  readonly sort: ProductSimilaritySort;
  /** 나만의 필터 성분이 든 유사템의 번호. 회원 정보에서 온다. 주의 칩의 판정에 함께 쓴다. */
  readonly myFilterProductIds?: readonly number[];
};

/**
 * 유사템 결과(명세 S276 저렴한 순 · S277 성분 유사한 순 · S280·S281 없음 · S286 실패).
 * 두 정렬은 성격이 달라 행을 다르게 그린다. 저렴한 순은 가격 줄, 성분 유사한 순은 겹치는 성분 줄이 둘째 자리를 맡는다.
 * 결과가 없거나 실패하면 개수·정렬·각주 없이 기준 제품 판 아래에 안내와 행동 하나만 둔다.
 */
export function SimilarProductsResult({ product, response, sort, myFilterProductIds = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const items = response?.items.slice(0, SIMILAR_PRODUCTS_LIMIT) ?? [];
  const partId = response?.partId ?? product.selectedPart?.id;
  const flow = featureFlowFor("similar_products", product.id);
  const context = { ...flow, base_product_id: product.id, base_part_id: partId };
  const baseUnitPrice = baseUnitPriceOf(product);
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
      {response === null ? (
        <ErrorState variant="section" onRetry={() => router.refresh()}>
          유사템을 불러오지 못했어요
        </ErrorState>
      ) : items.length === 0 ? (
        <EmptyState
          title="아직 비교할 유사템이 없어요"
          action={<DirectoryLinkButton href={SIMILAR_PRODUCTS_PATH}>다른 제품 찾기</DirectoryLinkButton>}
        />
      ) : (
        <section className="flex flex-col gap-3" aria-labelledby="similar-results-title" aria-busy={pending}>
          <h2 id="similar-results-title" className="flex gap-1 text-section font-bold text-text-primary">
            성분이 유사한 제품
            <span aria-hidden="true" className="text-text-secondary tabular-nums">
              {formatNumber(items.length)}
            </span>
            <span className="sr-only">{formatCount(items.length)}</span>
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
          <span role="status" className="sr-only">
            {pending ? "정렬하고 있어요" : ""}
          </span>
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col">
              {items.map((item, index) => (
                <li key={item.id} className="border-b border-border">
                  <ResultRow
                    product={item}
                    context={context}
                    sort={sort}
                    position={index + 1}
                    caution={item.containsExcludedIngredient || myFilterProductIds.includes(item.id)}
                    baseUnitPrice={item.volumeUnit === baseUnitPrice?.volumeUnit ? baseUnitPrice.text : undefined}
                  />
                </li>
              ))}
            </ul>
            <p className="text-caption whitespace-pre-line text-text-secondary">{similarityFootnote(sort)}</p>
          </div>
        </section>
      )}
    </div>
  );
}

/** 저렴한 순 행의 취소선 자리에 쓸 기준 제품 대표 용량의 단가. 단위가 같은 행에서만 견준다. */
const baseUnitPriceOf = (product: ProductDetailResponse) => {
  const variant = product.variants[0];
  if (!variant) return undefined;
  const perUnit = unitPrice(variant.price, variant);
  if (perUnit === undefined) return undefined;
  return { volumeUnit: variant.volumeUnit, text: formatPrice(perUnit) };
};

/** 여러 구성품 중 비교하는 구성품의 이름. 이름이 없으면 순서로 부른다. */
const selectedPartLabel = (product: ProductDetailResponse): string | undefined => {
  const selected = product.selectedPart;
  if (product.productParts.length <= 1 || !selected) return undefined;
  return selected.name ?? `${partOrder(product.productParts.findIndex((part) => part.id === selected.id))} 구성품`;
};

/** 기준 제품 판(명세 S276 Y5ozZ). 제품마다 판 높이가 같도록 이름은 한 줄로 자르고, 용량·가격·단가를 한 줄에 둔다. */
function SourceProduct({ product }: { readonly product: ProductDetailResponse }) {
  const variant = product.variants[0];
  const part = selectedPartLabel(product);
  const perUnit = variant ? formatUnitPrice(variant.price, variant) : undefined;
  return (
    <section aria-label="기준 제품" className="flex items-center gap-2 rounded-lg bg-surface p-4">
      <ProductImage src={product.imageUrl} size={48} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-label font-semibold text-text-secondary">기준 제품{part ? ` · ${part}` : ""}</p>
        <p className="truncate text-title font-semibold text-text-primary">
          {product.brand.name} {product.name}
        </p>
        {variant ? (
          <p className="flex flex-wrap items-center gap-x-2 text-caption">
            <span className="text-text-secondary">
              {formatVolume(variant)} · {formatPrice(variant.price)}
            </span>
            {perUnit ? (
              <span className="font-bold text-text-primary tabular-nums">{perUnit}</span>
            ) : (
              <span className="text-text-secondary">단위 가격 정보 없음</span>
            )}
          </p>
        ) : (
          <p className="text-caption text-text-secondary">가격 정보 없음</p>
        )}
      </div>
    </section>
  );
}

/** 주의 칩(명세 S276 morEu). 제품 상세 유사템 행과 같은 칩이고, 걸린 행에만 붙인다. 걸리지 않은 행은 아무것도 두지 않는다. */
function CautionChip() {
  return (
    <span className="flex h-6 shrink-0 items-center gap-0.5 rounded-full bg-warning-soft px-2 text-label leading-snug font-bold text-warning-text">
      <CautionStatusIcon caution size={12} />
      주의 있음
    </span>
  );
}

function ResultRow({
  product,
  context,
  sort,
  position,
  caution,
  baseUnitPrice,
}: {
  readonly product: SimilarProductWithGroups;
  readonly context: ProductFeatureContext & { readonly base_product_id: number };
  readonly sort: ProductSimilaritySort;
  readonly position: number;
  readonly caution: boolean;
  /** 기준 제품 단가('90원'). 저렴한 순에서 더 저렴한 행의 취소선으로 쓴다. */
  readonly baseUnitPrice?: string;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  const bySimilarity = sort === "SIMILARITY";
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
      className="pressable fb-bleed flex items-center gap-2 py-4"
    >
      <ProductImage src={product.imageUrl} size={48} className="shrink-0" />
      <span className={cn("flex min-w-0 flex-1 flex-col", bySimilarity ? "gap-1" : "gap-0.5")}>
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 flex-1 text-title font-semibold text-text-primary">
            {product.brand.name} {product.name}
          </span>
          {caution ? <CautionChip /> : null}
        </span>
        {bySimilarity ? (
          <>
            <SharedIngredients product={product} />
            <span className="flex flex-wrap items-center gap-x-2 text-caption">
              <span className="text-text-secondary">
                {formatVolume(product)} · {formatPrice(product.price)}
              </span>
              <SimilarityPrice product={product} />
            </span>
          </>
        ) : (
          <>
            <span className="text-caption text-text-secondary">
              {formatVolume(product)} · {formatPrice(product.price)}
            </span>
            <CheapestPrice product={product} baseUnitPrice={baseUnitPrice} />
          </>
        )}
      </span>
    </Link>
  );
}

/** 성분 유사한 순의 '겹치는 성분'(명세 S277 Q8xva). 서버가 성분군을 주지 않았거나 겹치는 것이 없으면 줄을 그리지 않는다. */
function SharedIngredients({ product }: { readonly product: SimilarProductWithGroups }) {
  const groups = product.sharedIngredientGroups ?? [];
  if (groups.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-label font-semibold text-text-secondary">겹치는 성분</span>
      {groups.map((group) => (
        <Tag key={group.name} variant="label" tone="muted">
          {group.name}
        </Tag>
      ))}
    </span>
  );
}

/** 성분 유사한 순의 단가와 차이. 더 저렴하면 초록 굵게, 같거나 비싸거나 견줄 수 없으면 회색 글자다. */
function SimilarityPrice({ product }: { readonly product: SimilarProductWithGroups }) {
  const perUnit = similarUnitPrice(product);
  if (!perUnit) return <span className="text-text-secondary">단위 가격 정보 없음</span>;
  const difference = unitPriceDifference(product);
  return (
    <span className="flex items-center gap-1 tabular-nums">
      <span className="font-bold text-text-primary">{perUnit}</span>
      <span className={difference.cheaper ? "font-bold text-success-text" : "text-text-secondary"}>
        {difference.text}
      </span>
    </span>
  );
}

/**
 * 저렴한 순의 가격 줄(명세 S276 mbVKZ). 더 저렴하면 '15% · ml당 77원 · 취소선 기준 단가', 아니면 단가 뒤에 차이를 회색으로 쓴다.
 * 단가가 없으면 '단위 가격 정보 없음'만 둔다.
 */
function CheapestPrice({
  product,
  baseUnitPrice,
}: {
  readonly product: SimilarProductWithGroups;
  readonly baseUnitPrice?: string;
}) {
  const perUnit = similarUnitPrice(product);
  if (!perUnit) return <span className="pt-0.5 text-caption text-text-secondary">단위 가격 정보 없음</span>;
  const difference = unitPriceDifference(product);
  if (!difference.cheaper) {
    return (
      <span className="flex flex-wrap items-center gap-1 pt-0.5 text-caption tabular-nums">
        <span className="font-bold text-text-primary">{perUnit}</span>
        <span className="text-text-secondary">{difference.text}</span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1 pt-0.5 text-caption tabular-nums">
      <span className="font-bold text-success-text">
        {difference.percent ?? difference.text}
        {difference.percent ? <span className="sr-only"> 저렴</span> : null}
      </span>
      <span className="font-bold text-text-primary">{perUnit}</span>
      {baseUnitPrice ? (
        <s className="text-text-secondary">
          <span className="sr-only">기준 제품 </span>
          {baseUnitPrice}
        </s>
      ) : null}
    </span>
  );
}
