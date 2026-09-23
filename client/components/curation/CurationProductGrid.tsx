import type { CurationProductResponse } from "@poudy/api/api.zod";

import { ProductGridCard } from "@/components/product/ProductGridCard";

type CurationProductGridProps = {
  readonly products: readonly CurationProductResponse[];
};

/** 첫 줄에 놓이는 수. 3열이므로 셋이다. 그만큼은 그림을 미루지 않고 받는다. */
const FIRST_ROW_COUNT = 3;

/**
 * 큐레이션이 제품을 늘어놓는 자리. 홈의 인기 제품과 같은 카드와 3열 격자를 쓴다.
 *
 * 두 화면이 같은 카드를 쓰면 제품이 어느 목록에 있든 같은 모양으로 읽힌다.
 */
export function CurationProductGrid({ products }: CurationProductGridProps) {
  return (
    /* 열 사이를 10, 행 사이를 16 으로 둔다. 행이 더 벌어져야 줄이 갈린다. 홈과 같은 값이다. */
    <ul className="grid grid-cols-3 gap-x-2.5 gap-y-4">
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
    </ul>
  );
}
