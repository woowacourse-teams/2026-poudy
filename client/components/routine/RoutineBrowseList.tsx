"use client";

import type { SharedRoutinePageResponse, SharedRoutineResponse, SharedRoutineSort } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useCallback, useEffect, useState } from "react";

import { RoutineListEnd } from "./RoutineListEnd";
import { RoutineSortChips } from "./RoutineSortChips";
import { SharedRoutineCard } from "./SharedRoutineCard";

import { fetchSharedRoutines } from "@/lib/api/routine";

type BrowseState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly items: readonly SharedRoutineResponse[];
      readonly page: number;
      readonly total: number;
      readonly hasNext: boolean;
      readonly loadingMore: boolean;
      readonly moreFailed: boolean;
    };

const firstPageState = (page: SharedRoutinePageResponse): BrowseState => ({
  status: "ready",
  items: page.items,
  page: 1,
  total: page.pagination.totalElements,
  hasNext: page.pagination.hasNext,
  loadingMore: false,
  moreFailed: false,
});

/** 둘러보기(RT8). 제품이 있는 공개 루틴을 고른 순서로 보여 주고, 목록 끝이 보이면 다음 쪽을 붙인다. */
export function RoutineBrowseList() {
  const [sort, setSort] = useState<SharedRoutineSort>("LATEST");
  const [state, setState] = useState<BrowseState>({ status: "loading" });

  const loadFirst = useCallback(
    () =>
      fetchSharedRoutines(sort, 1).then(
        (page) => setState(firstPageState(page)),
        () => setState({ status: "error" }),
      ),
    [sort],
  );

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (state.status !== "ready") return;
    setState({ ...state, loadingMore: true });
    try {
      const next = await fetchSharedRoutines(sort, state.page + 1);
      // 둘러보는 사이 새 루틴이 공개되면 쪽이 밀려 이미 본 루틴이 다시 온다. 겹친 것은 뺀다.
      const seen = new Set(state.items.map((routine) => routine.id));
      setState({
        status: "ready",
        items: [...state.items, ...next.items.filter((routine) => !seen.has(routine.id))],
        page: state.page + 1,
        total: next.pagination.totalElements,
        hasNext: next.pagination.hasNext,
        loadingMore: false,
        moreFailed: false,
      });
    } catch {
      setState({ ...state, loadingMore: false, moreFailed: true });
    }
  }, [sort, state]);

  const changeSort = (next: SharedRoutineSort) => {
    if (next === sort) return;
    setState({ status: "loading" });
    setSort(next);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-gutter pt-4">
        <RoutineSortChips value={sort} onValueChange={changeSort} />
      </div>
      <BrowseBody
        state={state}
        onRetry={() => {
          setState({ status: "loading" });
          loadFirst();
        }}
        onLoadMore={loadMore}
      />
    </div>
  );
}

function BrowseBody({
  state,
  onRetry,
  onLoadMore,
}: {
  readonly state: BrowseState;
  readonly onRetry: () => void;
  readonly onLoadMore: () => void;
}) {
  if (state.status === "loading") return null;
  if (state.status === "error") {
    return (
      <ErrorState
        variant="screen"
        icon={<Icon name="alert-circle" size={28} />}
        title="루틴을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" onClick={onRetry}>
            다시 시도
          </Button>
        }
        className="flex-1"
      />
    );
  }
  if (state.items.length === 0) {
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
    <div className="flex flex-col gap-3 px-gutter pt-3 pb-6">
      <ul className="flex flex-col gap-3">
        {state.items.map((routine) => (
          <li key={routine.id}>
            <SharedRoutineCard routine={routine} />
          </li>
        ))}
      </ul>
      <RoutineListEnd
        hasNext={state.hasNext}
        loadingMore={state.loadingMore}
        moreFailed={state.moreFailed}
        loadedCount={state.items.length}
        totalCount={state.total}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}
