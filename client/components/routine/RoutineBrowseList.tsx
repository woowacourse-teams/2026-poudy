"use client";

import { SharedRoutineSort, type SharedRoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { RoutineListEnd } from "./RoutineListEnd";
import { RoutineSortChips } from "./RoutineSortChips";
import { SharedRoutineCard } from "./SharedRoutineCard";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import type { FeatureFlow } from "@/lib/analytics/events";
import { newFeatureFlow } from "@/lib/analytics/feature-flow";
import { fetchSharedRoutines } from "@/lib/api/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { useRoutinePages, type RoutineListState } from "@/lib/hooks/useRoutinePages";
import { sharedRoutinePages } from "@/lib/storage/routine-pages-cache";

/** 정렬을 방문 기록에 남겨 링크 진입과 뒤로가기가 같은 목록을 가리키게 한다. */
export function RoutineBrowseList() {
  const params = useSearchParams();
  const sort = SharedRoutineSort.catch("LATEST").parse(params.get("sort"));
  return <SortedRoutineList key={sort} sort={sort} />;
}

function SortedRoutineList({ sort }: { readonly sort: SharedRoutineSort }) {
  const [flow] = useState(() => newFeatureFlow("routine", "feed"));
  const loadPage = useCallback(
    async (page: number) => {
      const result = await fetchSharedRoutines(sort, page);
      return { items: result.items, page, total: result.pagination.totalElements, hasNext: result.pagination.hasNext };
    },
    [sort],
  );
  const { state, retry, loadMore, rememberPosition } = useRoutinePages({
    path: `/routines/feed?sort=${sort}`,
    loadPage,
    cache: sharedRoutinePages,
  });
  useTrackedView(
    "routine_list_viewed",
    { ...flow, list_type: "feed", sort, result_count: state.status === "ready" ? state.data.total : 0 },
    { key: flow.feature_flow_id, enabled: state.status === "ready" },
  );
  const changeSort = (next: SharedRoutineSort) => {
    if (next === sort) return;
    rememberPosition();
    const url = new URL(window.location.href);
    url.searchParams.set("sort", next);
    window.history.pushState(null, "", url.pathname + url.search);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-gutter pt-4">
        <RoutineSortChips value={sort} onValueChange={changeSort} />
      </div>
      <BrowseBody state={state} flow={flow} onRetry={retry} onLoadMore={loadMore} />
    </div>
  );
}

function BrowseBody({
  state,
  flow,
  onRetry,
  onLoadMore,
}: {
  readonly state: RoutineListState<SharedRoutineResponse>;
  readonly flow: FeatureFlow;
  readonly onRetry: () => void;
  readonly onLoadMore: () => void;
}) {
  if (state.status === "loading" || state.status === "signedOut" || state.status === "adminSession") return null;
  if (state.status === "error") {
    return (
      <ErrorState
        variant="screen"
        icon={<Icon name="alert-circle" size={28} />}
        title="루틴을 불러오지 못했어요"
        description={RETRY_LATER}
        action={
          <Button variant="secondary" onClick={onRetry}>
            다시 시도
          </Button>
        }
        className="flex-1"
      />
    );
  }
  if (state.status !== "ready") return null;
  const list = state.data;
  if (list.items.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="world" size={28} />}
        title="아직 공개된 루틴이 없어요"
        description="내 루틴을 공개하면 여기에 보여요."
        className="flex-1"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 px-gutter pt-3 pb-inquiry">
      <ul className="flex flex-col gap-3">
        {list.items.map((routine) => (
          <li key={routine.id} data-scroll-anchor={routine.id}>
            <SharedRoutineCard routine={routine} flow={flow} />
          </li>
        ))}
      </ul>
      <RoutineListEnd
        hasNext={list.hasNext}
        loadingMore={list.loadingMore}
        moreFailed={list.moreFailed}
        loadedCount={list.items.length}
        totalCount={list.total}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}
