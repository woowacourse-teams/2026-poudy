"use client";

import type { RoutineProductResponse, RoutineSummaryResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { RoutineVisibility } from "./RoutineVisibility";

import { ProductImage } from "@/components/ui/ProductImage";
import { visibleThumbnailCount } from "@/lib/domain/routine";

/** 사진 칸이 들어갈 폭을 잰다. 처음 재기 전에는 null 이다. */
const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

/** 구간 한 줄. 카드 폭에 들어가는 만큼만 제품 사진을 보이고, 나머지는 '외 N'으로 알린다. */
export function TimeOfDayRow({
  icon,
  label,
  products,
}: {
  readonly icon: "sun" | "moon";
  readonly label: string;
  readonly products: readonly RoutineProductResponse[];
}) {
  const { ref, width } = useWidth();
  const shown = visibleThumbnailCount(width, products.length);

  return (
    <div className="flex items-center gap-2">
      <span className="flex min-w-15 shrink-0 items-center gap-1.5 text-body text-text-secondary">
        <Icon name={icon} size={16} />
        {label} {products.length}
      </span>
      <div ref={ref} className="flex min-w-0 flex-1 items-center gap-1.5">
        <ul className="flex min-w-0 gap-1.5 overflow-hidden">
          {products.slice(0, shown).map((product) => (
            <li key={product.id} className="size-8 shrink-0 overflow-hidden rounded-md bg-surface">
              <ProductImage src={product.imageUrl} size={32} sizes="32px" className="size-8" />
            </li>
          ))}
        </ul>
        {products.length > shown ? (
          <span className="shrink-0 text-caption text-text-secondary">외 {products.length - shown}</span>
        ) : null}
      </div>
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
