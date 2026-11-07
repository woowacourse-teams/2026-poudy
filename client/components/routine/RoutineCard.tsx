"use client";

import type { RoutineProductResponse, RoutineSummaryResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { RoutineReactionCounts } from "./RoutineReactionCounts";
import { RoutineVisibility } from "./RoutineVisibility";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

import { ProductImage } from "@/components/ui/ProductImage";
import { type TimeOfDay, visibleThumbnailCount } from "@/lib/domain/routine";

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

/** 구간 한 줄. 카드 폭에 들어가는 만큼만 제품 사진을 보이고, 나머지는 '외 N개'로 알린다. */
export function TimeOfDayRow({
  timeOfDay,
  label,
  products,
}: {
  readonly timeOfDay: TimeOfDay;
  readonly label: string;
  readonly products: readonly RoutineProductResponse[];
}) {
  const { ref, width } = useWidth();
  const shown = visibleThumbnailCount(width, products.length);

  return (
    <div className="flex items-center gap-2">
      <span className="flex min-w-15 shrink-0 items-center gap-1.5 text-body text-text-secondary">
        <TimeOfDayIcon timeOfDay={timeOfDay} size={16} />
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
          <span className="shrink-0 text-caption text-text-secondary">외 {products.length - shown}개</span>
        ) : null}
      </div>
    </div>
  );
}

/** 내 루틴 카드(RT2). 이름·공개 여부, 구간별 제품 사진, 좋아요·댓글 수를 보여 주고 누르면 상세로 간다. */
export function RoutineCard({ routine }: { readonly routine: RoutineSummaryResponse }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      {...pressableProps}
      href={`/routines/${routine.id}`}
      className="pressable press-scale fb-surface flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <span className="flex items-center gap-2">
        <span className="truncate text-bar font-bold text-text-primary">{routine.name}</span>
        <RoutineVisibility isPublic={routine.isPublic} />
        <Icon name="chevron-right" size={20} className="ms-auto shrink-0 text-text-secondary" />
      </span>
      <TimeOfDayRow timeOfDay="morning" label="아침" products={routine.morning} />
      <TimeOfDayRow timeOfDay="evening" label="저녁" products={routine.evening} />
      <RoutineReactionCounts likeCount={routine.likeCount} commentCount={routine.commentCount} />
    </Link>
  );
}
