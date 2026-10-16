"use client";

import type { SimilarProductResponse } from "@poudy/api/api.zod";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { CautionStatusIcon } from "@/components/ingredient/CautionStatusIcon";
import { Badge } from "@/components/ui/Badge";
import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { partHref } from "@/lib/domain/product-parts";

/**
 * S24 성분이 비슷한 제품. 서버가 미리 계산한 것을 최대 3개 보여 준다.
 *
 * 계산 결과가 없거나 받아 오지 못하면 섹션째 그리지 않는다. 빈 머리만 남으면 없는 것을 찾게 만든다.
 * 명세의 `겹치는 성분 N개` 줄은 응답에 겹치는 성분이 없어 아직 그리지 않는다.
 */
export function SimilarProducts({ products }: { readonly products: readonly SimilarProductResponse[] }) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-body leading-snug font-bold text-text-primary">성분이 비슷한 제품</h3>

      <ul className="flex flex-col">
        {products.map((product) => (
          <li key={product.id} className="border-b border-border last:border-b-0">
            <SimilarProductRow product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 행 전체가 링크라 화살표를 두지 않는다. 비교한 구성품으로 바로 열어 같은 성분표를 보게 한다.
 * 주의 칩은 브랜드와 같은 줄 오른쪽 끝에 둔다. 기기 글자 크기를 키워도 칩이 제품명 칸을 좁히지 않는다.
 */
function SimilarProductRow({ product }: { readonly product: SimilarProductResponse }) {
  // 스크롤하다 스친 행이 눌린 것처럼 깜박이지 않게 잠깐 기다린다(STATE S05).
  const { pressableProps } = usePressable({ delayMs: 80 });
  const caution = product.containsExcludedIngredient;

  return (
    <Link
      href={partHref(product.id, product.partId, "similar_product")}
      {...pressableProps}
      className="pressable fb-surface flex min-h-22 items-center gap-3 py-3"
    >
      <ProductImage
        src={product.imageUrl || PRODUCT_PLACEHOLDER}
        alt=""
        size={64}
        loading="lazy"
        className="size-16 shrink-0 object-contain"
      />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-caption font-medium text-text-secondary">
            {product.brand.name}
          </span>
          <Badge variant={caution ? "caution" : "noCaution"} icon={<CautionStatusIcon caution={caution} size={12} />}>
            {caution ? "주의" : "주의 없음"}
          </Badge>
        </span>
        <span className="text-title font-medium text-text-primary">{product.name}</span>
      </span>
    </Link>
  );
}
