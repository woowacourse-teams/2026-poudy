import type { RoutineProductResponse, RoutineSummaryResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";

import { RoutineVisibility } from "./RoutineVisibility";

import { ProductImage } from "@/components/ui/ProductImage";

/** 카드 한 줄에 보이는 제품 사진 수. 넘치는 제품은 개수로만 알린다. */
const SHOWN_IMAGES = 4;

function TimeOfDayRow({
  icon,
  label,
  products,
}: {
  readonly icon: "sun" | "moon";
  readonly label: string;
  readonly products: readonly RoutineProductResponse[];
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-16 shrink-0 items-center gap-1.5 text-body text-text-secondary">
        <Icon name={icon} size={16} />
        {label} {products.length}
      </span>
      <ul className="flex min-w-0 gap-2">
        {products.slice(0, SHOWN_IMAGES).map((product) => (
          <li key={product.id} className="overflow-hidden rounded-md bg-surface">
            <ProductImage src={product.imageUrl} size={40} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 내 루틴 카드(RT2). 이름·공개 여부와 구간별 제품 사진을 보여 주고 누르면 상세로 간다. */
export function RoutineCard({ routine }: { readonly routine: RoutineSummaryResponse }) {
  return (
    <Link
      href={`/routine/${routine.id}`}
      className="pressable fb-surface flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <span className="flex items-center gap-2">
        <span className="truncate text-bar font-bold text-text-primary">{routine.name}</span>
        <RoutineVisibility isPublic={routine.isPublic} />
        <Icon name="chevron-right" size={20} className="ms-auto shrink-0 text-text-secondary" />
      </span>
      <TimeOfDayRow icon="sun" label="아침" products={routine.morning} />
      <TimeOfDayRow icon="moon" label="저녁" products={routine.evening} />
    </Link>
  );
}
