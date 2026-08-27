"use client";

import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { IngredientSearchPanel } from "./IngredientSearchPanel";

import { Button } from "@/components/ui/Button";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { track } from "@/lib/analytics/track";
import { serializeFilter } from "@/lib/domain/filter";
import { countConditions, summarizeFilter } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";
import { useIngredientNames } from "@/lib/hooks/useIngredientNames";
import { useCountState } from "@/lib/hooks/useProductCount";
import { addRecentFilter } from "@/lib/storage/recent-filters";

/** S03 성분 필터링. 조건은 이 화면의 URL 에 담는다. */
export function IngredientSearchScreen({ excludeCodes }: { readonly excludeCodes: readonly ExcludeCodeResponse[] }) {
  const { filter, setCondition } = useFilterQuery("/search/ingredients");

  // 조건에는 ID 만 남으므로 이름은 서버에서 가져온다. 링크로 들어와도 이름이 보인다.
  const names = useIngredientNames([...filter.includeIngredientIds, ...filter.excludeIngredientIds]);

  const total = countConditions(filter);
  const summary = summarizeFilter(filter, names);

  // 바텀시트와 같은 문구를 쓴다. 조건을 바꾸면 개수가 따라 바뀐다.
  const { count, counting } = useCountState(filter);
  const countLabel = count === undefined ? "" : `${count.toLocaleString("ko-KR")}개 `;
  const resultKey = serializeFilter(filter).toString();
  const trackedEmptyResult = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (total === 0 || counting || count !== 0 || trackedEmptyResult.current === resultKey) return;
    trackedEmptyResult.current = resultKey;

    track("search_results_viewed", {
      mode: "ingredient",
      result_count: 0,
      include_count: filter.includeIngredientIds.length,
      exclude_count: filter.excludeIngredientIds.length,
      exclude_group_count: filter.excludeCodes.length,
    });
  }, [count, counting, filter, resultKey, total]);

  /*
   * 넘어갈 수 없는 두 경우를 함께 막는다.
   *
   * 세는 동안 화면에 남아 있는 숫자는 이전 조건의 것이라 그대로 눌러 넘어가면 다른
   * 결과를 만난다. 0 개는 볼 것이 없는 목록이다.
   */
  const blocked = counting || count === 0;

  /*
   * 숫자는 다이얼로 굴리고 낭독기에는 완성된 문구만 전한다. 구르는 동안에는
   * 자리마다 0-9 가 모두 DOM 에 있어 그대로 읽히면 뜻이 되지 않는다.
   */
  const button = (
    <Button disabled={blocked} aria-label={`${countLabel}조건에 맞는 제품 보기`}>
      <span aria-hidden className="inline-flex items-center">
        {count === undefined ? null : <RollingNumber value={count} />}
        {countLabel === "" ? "" : "개 "}조건에 맞는 제품 보기
      </span>
    </Button>
  );

  return (
    /*
     * 개수 블록을 본문 안에 둔다. 본문 뒤 형제로 두면 sticky 가 걸려 있어도 제 자리가
     * 문서 끝이라, 조건을 여럿 걸어 목록이 길어질 때 화면 밖으로 밀려 보이지 않는다.
     * 본문 안에 있으면 스크롤 어디에서나 아래에 붙는다.
     */
    <main className="flex flex-1 flex-col">
      <div className="flex-1">
        <IngredientSearchPanel filter={filter} onChange={setCondition} excludeCodes={excludeCodes} names={names} />
      </div>

      {/* bottom-18 은 하단 네비게이션 높이다. 0 으로 두면 네비가 이 블록을 가린다. */}
      {total > 0 ? (
        <div className="sticky bottom-18 border-t border-border bg-white p-4">
          <p className="pb-2 text-[12px] text-text-secondary">{summary}</p>
          {/*
            막을 때도 Link 를 걷어 내지 않는다. 감싸는 것이 바뀌면 React 가 안쪽을 새로
            만들어, 새 개수가 도착하는 그 순간 다이얼이 다시 태어나 구르지 못한다.
            대신 넘어가지 못하게 눌림을 막는다.
          */}
          <Link
            href={`/products?${serializeFilter(filter).toString()}`}
            aria-disabled={blocked}
            tabIndex={blocked ? -1 : undefined}
            onClick={(event) => {
              if (blocked || count === undefined) {
                event.preventDefault();
                return;
              }
              track("search_submitted", {
                mode: "ingredient",
                result_count: count,
                include_count: filter.includeIngredientIds.length,
                exclude_count: filter.excludeIngredientIds.length,
                exclude_group_count: filter.excludeCodes.length,
              });
              addRecentFilter({
                query: serializeFilter(filter).toString(),
                summary,
                mode: "ingredient",
              });
            }}
          >
            {button}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
