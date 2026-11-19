"use client";

import type { RatingPreference, SharedRoutineResponse, ShelfResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { useDragScroll } from "@poudy/design-system/use-drag-scroll";
import { useEffect, useState } from "react";

import { RoutineAuthorLine, RoutinePhotoCard } from "@/components/routine/RoutinePhotoCard";
import { fetchProductRoutines } from "@/lib/api/routine";
import { fetchShelf } from "@/lib/api/shelf";

/** 루틴에 든 제품 중 파우치에 있는 것. 지금 보고 있는 제품은 이 화면 위쪽이 이미 말하므로 세지 않는다. */
const pouchOverlap = (routine: SharedRoutineResponse, shelf: ShelfResponse | undefined, productId: number) => {
  const ratings = new Map<number, RatingPreference>();
  if (!shelf) return { used: false, ratings };
  const inRoutine = new Set([...routine.morning, ...routine.evening].map((product) => product.id));
  let used = false;
  for (const item of shelf.items) {
    if (item.product.id === productId || !inRoutine.has(item.product.id)) continue;
    used = true;
    if (item.rating.preference) ratings.set(item.product.id, item.rating.preference);
  }
  return { used, ratings };
};

/**
 * 제품 상세 아래쪽의 '이 제품이 들어간 루틴'(S354 · S356~S358, 섹션 j6nApu). 이 제품을 담은 공개 루틴(좋아요 순 최대 3개)을
 * 사진 판 카드로 가로로 늘어놓는다. 줄은 오른쪽 화면 끝까지 이어지고, 마지막 카드 뒤에 거터만큼 비운다. 루틴이 하나면 폭을 채운다.
 * 로그인했고 파우치 제품이 루틴과 겹치면 사진에 평가 배지를, 이름 아래에 '이 루틴에 내가 써 본 제품이 있어요'를 둔다.
 * 비었거나 받지 못하면 섹션째 숨기고, 스켈레톤 없이 응답 뒤에 그린다.
 */
export function ProductRoutines({ productId, signedIn }: { readonly productId: number; readonly signedIn: boolean }) {
  const dragScroll = useDragScroll();
  const [routines, setRoutines] = useState<readonly SharedRoutineResponse[]>([]);
  const [shelf, setShelf] = useState<ShelfResponse>();

  useEffect(() => {
    let active = true;
    fetchProductRoutines(productId).then(
      (result) => {
        if (active) setRoutines(result.items);
      },
      () => {
        if (active) setRoutines([]);
      },
    );
    return () => {
      active = false;
    };
  }, [productId]);

  // 겹치는 제품은 루틴이 있을 때만 본다. 로그인 전에는 파우치를 부르지 않는다.
  const hasRoutines = routines.length > 0;
  useEffect(() => {
    if (!signedIn || !hasRoutines) return;
    let active = true;
    fetchShelf().then(
      (result) => {
        if (active) setShelf(result);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [signedIn, hasRoutines]);

  if (!hasRoutines) return null;
  const single = routines.length === 1;

  return (
    <section aria-labelledby="product-routines-title" className="flex flex-col gap-3">
      <h2 id="product-routines-title" className="text-section font-bold text-text-primary">
        이 제품이 들어간 루틴
      </h2>
      {/* 폭은 본문 칸과 같고 오른쪽 여백(거터)만큼 더 넓혀 화면 끝까지 잇는다. 그 여백이 마지막 카드 뒤의 빈자리가 된다. */}
      <ul {...dragScroll} className="scrollbar-none box-content flex w-full snap-x gap-3 overflow-x-auto pe-(--gutter)">
        {routines.map((routine) => {
          const { used, ratings } = pouchOverlap(routine, shelf, productId);
          return (
            <li key={routine.id} className={cn("flex shrink-0 snap-start", single ? "w-full" : "w-70")}>
              <RoutinePhotoCard
                routine={routine}
                href={`/routines/${routine.id}`}
                currentProductId={productId}
                ratings={ratings}
                fixedPanel
                className="w-full"
                notice={
                  used ? (
                    <span className="flex items-center gap-1 text-caption text-text-primary">
                      <Icon name="vanity-case" size={16} className="shrink-0 text-text-secondary" />이 루틴에 내가 써 본
                      제품이 있어요
                    </span>
                  ) : null
                }
                footer={<RoutineAuthorLine author={routine.author} likeCount={routine.likeCount} />}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
