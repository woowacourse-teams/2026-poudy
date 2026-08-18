"use client";

import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

  const mode: SearchMode = searchParams.get("mode") === "ingredient" ? "ingredient" : "product";
  const total = countConditions(filter);
  const summary = summarizeFilter(filter);

  return (
    <>
      <SearchTabs mode={mode} query={searchParams.toString()} />

      <main className="flex-1">
        {mode === "product" ? (
          <ProductSearchPanel />
        ) : (
          <IngredientSearchPanel filter={filter} onChange={setCondition} excludeCodes={excludeCodes} />
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
