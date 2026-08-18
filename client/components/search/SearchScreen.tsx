"use client";

import type { ExcludeCodeResponse, IngredientResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { IngredientSearchPanel } from "./IngredientSearchPanel";
import { ProductSearchPanel } from "./ProductSearchPanel";
import { type SearchMode, SearchTabs } from "./SearchTabs";

import { Button } from "@/components/ui/Button";
import { serializeFilter } from "@/lib/domain/filter";
import { countConditions, summarizeFilter } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { addRecentFilter } from "@/lib/storage/recent-filters";

/** S02·S03 탐색 조건 설정. 탭이 바뀌어도 조건은 URL 에 남아 이어진다. */
export function SearchScreen({ excludeCodes }: { readonly excludeCodes: readonly ExcludeCodeResponse[] }) {
  const searchParams = useSearchParams();
  const { filter, setCondition } = useFilterQuery("/search");

  // 조건은 ID 만 URL 에 남는다. 화면에 이름을 보여 주려고 만난 성분을 기억해 둔다.
  const [names, setNames] = useState<ReadonlyMap<number, string>>(new Map());

  const learnNames = (ingredients: readonly IngredientResponse[]) => {
    setNames((previous) => {
      const next = new Map(previous);
      for (const item of ingredients) next.set(item.id, item.koreanName);
      return next;
    });
  };

  const mode: SearchMode = searchParams.get("mode") === "ingredient" ? "ingredient" : "product";
  const total = countConditions(filter);
  const summary = summarizeFilter(filter, names);

  return (
    <>
      <SearchTabs mode={mode} query={searchParams.toString()} />

      <main className="flex-1">
        {mode === "product" ? (
          <ProductSearchPanel />
        ) : (
          <IngredientSearchPanel
            filter={filter}
            onChange={setCondition}
            excludeCodes={excludeCodes}
            names={names}
            onLearnNames={learnNames}
          />
        )}
      </main>

      {total > 0 ? (
        <div className="sticky bottom-0 border-t border-border bg-white p-4">
          <p className="pb-2 text-[12px] text-text-secondary">{summary}</p>
          <Link
            href={`/products?${serializeFilter(filter).toString()}`}
            onClick={() => addRecentFilter({ query: serializeFilter(filter).toString(), summary, mode })}
          >
            <Button>조건에 맞는 제품 보기</Button>
          </Link>
        </div>
      ) : null}
    </>
  );
}
