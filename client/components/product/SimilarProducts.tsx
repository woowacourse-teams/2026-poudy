"use client";

import type { SimilarProductResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { usePressable } from "@poudy/design-system/use-pressable";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import { LevelTag } from "@/components/ui/LevelTag";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatPrice, formatVolume } from "@/lib/domain/format";
import { partHref } from "@/lib/domain/product-parts";

/**
 * S24 성분이 비슷한 제품. 서버가 미리 계산한 것을 최대 3개 보여 준다.
 *
 * 계산 결과가 없거나 받아 오지 못하면 섹션째 그리지 않는다. 빈 머리만 남으면 없는 것을 찾게 만든다.
 */
export function SimilarProducts({
  products,
  myFilterProductIds = [],
}: {
  readonly products: readonly SimilarProductResponse[];
  /** 나만의 필터 성분이 든 비슷한 제품의 번호. 회원 정보에서 온다. 주의 칩의 판정에 함께 쓴다(S60 ⑦). */
  readonly myFilterProductIds?: readonly number[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-body leading-snug font-bold text-text-primary">성분이 비슷한 제품</h3>

      <ul className="flex flex-col">
        {products.map((product) => (
          <li key={product.id} className="border-b border-border last:border-b-0">
            <SimilarProductRow
              product={product}
              caution={product.containsExcludedIngredient || myFilterProductIds.includes(product.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 지금 제품의 대표 용량 가격과 견준 차이(S60 ⑦). 숫자로만 쓰고 ml당 가격은 쓰지 않는다.
 * 더 저렴하면 초록, 더 비싸도 경고색을 쓰지 않는다.
 */
const priceDifferenceOf = (difference: number) => {
  if (difference < 0) return { text: `지금 제품보다 ${formatPrice(-difference)} 더 저렴해요`, cheaper: true };
  if (difference > 0) return { text: `지금 제품보다 ${formatPrice(difference)} 더 비싸요`, cheaper: false };
  return { text: "지금 제품과 가격이 같아요", cheaper: false };
};

/**
 * 비슷한 제품 카드(S60 ⑦). 행 전체가 링크라 화살표를 두지 않는다. 비교한 구성품으로 바로 열어 같은 성분표를 보게 한다.
 *
 * - 주의 칩은 브랜드와 같은 줄 오른쪽 끝에 둔다. 기기 글자 크기를 키워도 칩이 제품명 칸을 좁히지 않는다.
 *   나에게 안 맞는 성분도 '주의 있음'으로 보되, 어떤 성분 때문인지는 카드에 쓰지 않는다.
 * - 가격 · 대표 용량, 가격 차이, 수분감 · 유분감을 차례로 둔다. 유수분 평가 대상이 아닌 제품(값이 없음)은 그 줄을 숨긴다.
 */
function SimilarProductRow({
  product,
  caution,
}: {
  readonly product: SimilarProductResponse;
  readonly caution: boolean;
}) {
  // 스크롤하다 스친 행이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });
  const difference = priceDifferenceOf(product.priceDifference);

  return (
    <Link
      entryPoint="similar_product"
      href={partHref(product.id, product.partId)}
      {...pressableProps}
      className="pressable fb-bleed flex items-center gap-3 py-3"
    >
      <ProductImage src={product.imageUrl} size={64} loading="lazy" className="shrink-0" />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-caption leading-snug font-medium text-text-secondary">
            {product.brand.name}
          </span>
          <span
            className={cn(
              "flex h-6 shrink-0 items-center gap-0.5 rounded-full px-2 text-label leading-snug font-bold",
              caution ? "bg-warning-soft text-warning-text" : "bg-success-soft text-success-text",
            )}
          >
            <CautionStatusIcon caution={caution} size={12} />
            {caution ? "주의 있음" : "주의 없음"}
          </span>
        </span>
        <span className="text-title leading-snug font-medium text-text-primary">{product.name}</span>

        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1 text-caption leading-snug">
            <span className="font-bold text-text-primary">{formatPrice(product.price)}</span>
            <span className="text-text-secondary">· {formatVolume(product)}</span>
          </span>
          <span
            className={cn(
              "text-caption leading-snug font-semibold",
              difference.cheaper ? "text-success-text" : "text-text-secondary",
            )}
          >
            {difference.text}
          </span>
          {product.moistureLevel !== null || product.oilLevel !== null ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <LevelTag kind="moisture" level={product.moistureLevel} />
              <LevelTag kind="oil" level={product.oilLevel} />
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
