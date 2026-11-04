import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";

import { ProductImage } from "@/components/ui/ProductImage";

/** 공개 루틴의 구간 제품(RT9). 바르는 순서대로 보여 주고, 행을 누르면 제품 상세로 간다. */
export function RoutineProductList({ products }: { readonly products: readonly RoutineProductResponse[] }) {
  return (
    <ol className="flex flex-col">
      {products.map((product, index) => (
        <li key={product.id} className="border-b border-border">
          <Link href={`/products/${product.id}`} className="pressable fb-surface flex items-center gap-4 py-3">
            <span className="w-4 shrink-0 text-center text-body font-semibold text-text-secondary">{index + 1}</span>
            <span className="overflow-hidden rounded-md bg-surface">
              <ProductImage src={product.imageUrl} size={64} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
              <span className="truncate text-body font-semibold text-text-primary">{product.name}</span>
            </span>
            <Icon name="chevron-right" size={20} className="shrink-0 text-text-secondary" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
