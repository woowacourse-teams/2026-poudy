import type { SimilarProductResponse } from "@poudy/api/api.zod";
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
 * 디자인의 `겹치는 성분 N개` 줄은 응답에 겹치는 성분이 없어 아직 그리지 않는다.
 */
export function SimilarProducts({ products }: { readonly products: readonly SimilarProductResponse[] }) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[14px] font-bold text-[#182132]">성분이 비슷한 제품</h3>

      <ul>
        {products.map((product) => (
          <li key={product.id} className="border-b border-[#DEE2E9] last:border-b-0">
            {/* 행 전체가 링크라 화살표를 두지 않는다. 비교한 구성품으로 바로 열어 같은 성분표를 보게 한다. */}
            <Link
              href={partHref(product.id, product.partId, "similar_product")}
              className="flex min-h-[88px] items-center gap-3 transition-colors duration-press ease-out active:bg-[#EFF1F5]"
            >
              <ProductImage
                src={product.imageUrl || PRODUCT_PLACEHOLDER}
                alt=""
                size={64}
                loading="lazy"
                className="size-16 shrink-0 rounded-xl object-contain"
              />

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-[#566273]">{product.brand.name}</span>
                  <CautionChip caution={product.containsExcludedIngredient} />
                </span>
                <span className="text-[14px] font-semibold text-[#182132]">{product.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 빠른 제외 성분군 6종 가운데 하나라도 들었는지. 색과 함께 글자로도 알린다. */
function CautionChip({ caution }: { readonly caution: boolean }) {
  return (
    <Badge variant={caution ? "caution" : "noCaution"} icon={<CautionStatusIcon caution={caution} size={12} />}>
      {caution ? "주의" : "주의 없음"}
    </Badge>
  );
}
