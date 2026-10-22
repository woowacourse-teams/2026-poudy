import type { CurationProductResponse } from "@poudy/api/api.zod";

import { ProductGrid, ProductGridCard } from "@/components/product/ProductGridCard";

type CurationProductGridProps = {
  readonly products: readonly CurationProductResponse[];
};

/** 첫 줄에 놓이는 수. 3열 기준으로 셋이다. 그만큼은 그림을 미루지 않고 받는다. */
const FIRST_ROW_COUNT = 3;

/**
 * 큐레이션이 제품을 늘어놓는 자리. 홈의 사람들이 보는 제품과 같은 카드와 격자를 쓴다(명세 S20b).
 *
 * 두 화면이 같은 카드를 쓰면 제품이 어느 목록에 있든 같은 모양으로 읽힌다.
 */
export function CurationProductGrid({ products }: CurationProductGridProps) {
  return (
    <ProductGrid>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductGridCard
            id={product.id}
            name={product.name}
            brandName={product.brandName}
            imageUrl={product.imageUrl}
            from="curation"
            loading={index < FIRST_ROW_COUNT ? "eager" : "lazy"}
          />
        </li>
      ))}
    </ProductGrid>
  );
}
