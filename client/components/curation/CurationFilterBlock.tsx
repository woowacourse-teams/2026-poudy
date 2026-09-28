"use client";

import type { CurationProductsByFilterBlockResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { CurationProductGrid } from "./CurationProductGrid";

import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { track } from "@/lib/analytics/track";

type CurationFilterBlockProps = {
  /** 이벤트에 어느 기획전의 어느 블록인지 함께 남긴다. */
  readonly curationId: number;
  readonly blockId: string;
  readonly filters: CurationProductsByFilterBlockResponse["filters"];
  readonly products: CurationProductsByFilterBlockResponse["products"];
};

/**
 * 필터가 달린 제품 블록.
 *
 * 필터는 화면 전체가 아니라 이 블록 안에서만 듣는다. 한 화면에 이런 블록이 여럿 올 수
 * 있어, 고른 필터를 블록마다 따로 들고 있어야 한 블록을 건드렸을 때 다른 블록이 같이
 * 바뀌지 않는다.
 *
 * 거르는 일은 서버에 다시 묻지 않고 여기서 한다. 제품이 이미 응답에 들어 있고 무엇으로
 * 거를지도 함께 내려와, 다시 물어 봐야 같은 답을 받는다.
 */
export function CurationFilterBlock({ curationId, blockId, filters, products }: CurationFilterBlockProps) {
  /* 아무것도 고르지 않은 상태가 전체다. 처음에는 블록의 제품을 모두 보여 준다. */
  const [selected, setSelected] = useState<string | null>(null);

  const select = (filter: { readonly id: string | null; readonly label: string }) => {
    setSelected(filter.id);
    track(
      "curation_filter_selected",
      filter.id === null
        ? { curation_id: curationId, block_id: blockId }
        : { curation_id: curationId, block_id: blockId, filter_id: filter.id, filter_label: filter.label },
    );
  };

  const shown = selected === null ? products : products.filter(({ filterIds }) => filterIds.includes(selected));

  return (
    <div className="flex flex-col gap-4">
      {/* 칩은 본문보다 넓게 훑고 지나가도록 좌우 여백 밖으로 빼낸다. 홈의 카테고리 칩과 같다. */}
      <ul className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {[{ id: null, label: "전체" }, ...filters].map((filter) => {
          const active = selected === filter.id;
          return (
            <li key={filter.id ?? "all"}>
              <button
                type="button"
                onClick={() => select(filter)}
                aria-pressed={active}
                className={[
                  "filter-chip inline-flex h-8 shrink-0 items-center rounded-2xl border px-3 text-[13px] leading-none font-medium",
                  "motion-reduce:transition-none",
                  active
                    ? "border-[#212124] bg-[#212124] font-semibold text-white"
                    : "border-[#DCDEE3] bg-white text-[#212124]",
                ].join(" ")}
              >
                {filter.label}
              </button>
            </li>
          );
        })}
      </ul>

      {shown.length === 0 ? (
        <EmptyNotice icon="search" title="고른 조건에 맞는 제품이 없어요" detail="다른 조건으로 바꿔 보세요" />
      ) : (
        <CurationProductGrid products={shown.map(({ product }) => product)} />
      )}
    </div>
  );
}
