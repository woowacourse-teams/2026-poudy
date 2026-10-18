"use client";

import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon } from "@poudy/design-system/icon";
import { useRouter } from "next/navigation";

import { useProductListActions } from "@/components/product/product-list-context";
import { type Filter, hasCondition } from "@/lib/domain/filter";
import { josaOf } from "@/lib/domain/format";

/** 검색어 말고는 걸린 조건이 없는지. 검색어만 걸린 0개는 검색 결과 없음(S51d)이다. */
const keywordOnly = (filter: Filter): boolean =>
  Boolean(filter.keyword) && !hasCondition({ ...filter, keyword: undefined });

const hasIngredientCondition = (filter: Filter): boolean =>
  filter.includeIngredientIds.length +
    filter.excludeIngredientIds.length +
    filter.excludeCodes.length +
    filter.includeGroupCodes.length +
    filter.excludeGroupCodes.length >
  0;

/**
 * 조건 일치 제품(/products)의 결과가 0개일 때(FEEDBACK F03). Next 의 파일 규칙은 아니고, not-found.tsx 처럼 경로를
 * 보고 찾을 수 있게 경로 옆에 둔다. 필터 칩과 적용된 조건 줄은 그대로 남아 무엇이 걸렸는지 보인다.
 *
 * - 검색어만 걸렸으면 검색 결과 없음(S51d). 입력어를 인용하고 [다시 검색하기]로 검색 화면에 입력어를 채워 돌아간다.
 * - 그 밖에는 조건 결과 없음(S51e). 성분 조건이 있으면 [성분 조건 수정하기]로 성분 시트를 열고, 없으면 [조건 모두 지우기].
 */
export function ProductsEmpty() {
  const router = useRouter();
  const { filter, openSheet, basePath } = useProductListActions();

  if (filter.keyword && keywordOnly(filter)) {
    const { keyword } = filter;
    return (
      <EmptyState
        icon={<Icon name="zoom-cancel" size={28} />}
        title={`‘${keyword}’${josaOf(keyword, "은/는")} 그물에 안 걸렸어요`}
        description={"제품명 철자를 확인하거나,\n브랜드 이름만으로 다시 던져 보세요."}
        action={
          <Button
            variant="secondary"
            onClick={() => router.push(`/search/products?${new URLSearchParams({ keyword }).toString()}`)}
          >
            다시 검색하기
          </Button>
        }
        className="flex-1"
      />
    );
  }

  return (
    <EmptyState
      icon={<Icon name="adjustments-horizontal" size={28} />}
      title="조건이 너무 깐깐했나 봐요"
      description={"선별기를 다 돌려도 통과한 제품이 없어요.\n조건을 하나씩 빼 보세요."}
      action={
        hasIngredientCondition(filter) ? (
          <Button variant="secondary" onClick={() => openSheet("ingredient")}>
            성분 조건 수정하기
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => router.push(basePath)}>
            조건 모두 지우기
          </Button>
        )
      }
      className="flex-1"
    />
  );
}
