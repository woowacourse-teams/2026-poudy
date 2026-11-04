"use client";

import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { BottomSheet, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MenuRow } from "./RoutineMenuSheet";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

import { ProductImage } from "@/components/ui/ProductImage";
import { TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";

type RoutineProductMenuSheetProps = {
  readonly product: RoutineProductResponse | undefined;
  /** 제품을 옮길 구간. 그 구간에 이미 같은 제품이 있으면 undefined 라 옮기기를 두지 않는다. */
  readonly moveTo: TimeOfDay | undefined;
  readonly onClose: () => void;
  readonly onMove: (product: RoutineProductResponse) => void;
  readonly onRemove: (product: RoutineProductResponse) => void;
};

/** 제품 더보기 시트(RT7-b). 제품 정보 보기, 다른 구간으로 옮기기, 루틴에서 빼기. */
export function RoutineProductMenuSheet({ product, moveTo, onClose, onMove, onRemove }: RoutineProductMenuSheetProps) {
  const router = useRouter();
  // 닫히는 동안에도 마지막 제품을 그대로 보여 준다.
  const [shown, setShown] = useState(product);
  if (product && product !== shown) setShown(product);

  return (
    <BottomSheet open={product !== undefined} onClose={onClose}>
      {shown ? (
        <>
          <BottomSheetHeader
            title={
              <span className="flex items-center gap-3">
                <span className="overflow-hidden rounded-md bg-surface">
                  <ProductImage src={shown.imageUrl} size={48} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-caption font-normal text-text-secondary">{shown.brandName}</span>
                  <span className="truncate text-body font-semibold">{shown.name}</span>
                </span>
              </span>
            }
          />
          <div className="flex flex-col pb-safe">
            <MenuRow icon="info-circle" label="제품 정보 보기" onPress={() => router.push(`/products/${shown.id}`)} />
            {moveTo ? (
              <MenuRow
                icon={<TimeOfDayIcon timeOfDay={moveTo} size={20} />}
                label={`${TIME_OF_DAY_LABEL[moveTo]}으로 옮기기`}
                onPress={() => onMove(shown)}
              />
            ) : null}
            <div className="border-t border-border">
              <MenuRow icon="minus" label="루틴에서 빼기" danger onPress={() => onRemove(shown)} />
            </div>
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}
