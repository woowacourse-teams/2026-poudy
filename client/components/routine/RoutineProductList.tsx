import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";

import { AttributionLink as Link } from "@/components/analytics/AttributionLink";
import { ProductImage } from "@/components/ui/ProductImage";
import { routineFlow } from "@/lib/analytics/routine";

/** 공개 루틴의 구간 제품(RT9). 바르는 순서대로 보여 주고, 행을 누르면 제품 상세로 간다. */
export function RoutineProductList({
  products,
  routineId,
}: {
  readonly products: readonly RoutineProductResponse[];
  readonly routineId: number;
}) {
  return (
    <ol className="flex flex-col">
      {products.map((product, index) => (
        <li key={product.id} className="border-b border-border">
          <ProductRow product={product} order={index + 1} routineId={routineId} />
        </li>
      ))}
    </ol>
  );
}

function ProductRow({
  product,
  order,
  routineId,
}: {
  readonly product: RoutineProductResponse;
  readonly order: number;
  readonly routineId: number;
}) {
  const { pressableProps } = usePressable();

  return (
    <Link
      {...pressableProps}
      href={`/products/${product.id}`}
      entryPoint="routine"
      featureContext={{ ...routineFlow(routineId), routine_id: routineId }}
      className="pressable fb-bleed flex items-center gap-4 py-3"
    >
      <span className="w-4 shrink-0 text-center text-body font-semibold text-text-secondary">{order}</span>
      <span className="overflow-hidden rounded-md bg-surface">
        <ProductImage src={product.imageUrl} size={64} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
        <span className="truncate text-body font-semibold text-text-primary">{product.name}</span>
      </span>
      <Icon name="chevron-right" size={20} className="shrink-0 text-text-secondary" />
    </Link>
  );
}
