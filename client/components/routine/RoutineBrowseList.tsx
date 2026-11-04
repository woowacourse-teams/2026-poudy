"use client";

import type { SharedRoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useCallback, useEffect, useState } from "react";

import { SharedRoutineCard } from "./SharedRoutineCard";

import { fetchSharedRoutines } from "@/lib/api/routine";

type BrowseState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly items: readonly SharedRoutineResponse[];
      readonly page: number;
      readonly hasNext: boolean;
      readonly loadingMore: boolean;
    };

/** 둘러보기(RT8). 제품이 있는 공개 루틴을 최신순으로 보여 주고, 더 있으면 '더 보기'로 다음 쪽을 붙인다. */
export function RoutineBrowseList() {
  const [state, setState] = useState<BrowseState>({ status: "loading" });

  const loadFirst = useCallback(
    () =>
      fetchSharedRoutines(1).then(
        (page) =>
          setState({
            status: "ready",
            items: page.items,
            page: 1,
            hasNext: page.pagination.hasNext,
            loadingMore: false,
          }),
        () => setState({ status: "error" }),
      ),
    [],
  );

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (state.status !== "ready") return;
    setState({ ...state, loadingMore: true });
    try {
      const next = await fetchSharedRoutines(state.page + 1);
      // 둘러보는 사이 새 루틴이 공개되면 쪽이 밀려 이미 본 루틴이 다시 온다. 겹친 것은 뺀다.
      const seen = new Set(state.items.map((routine) => routine.id));
      setState({
        status: "ready",
        items: [...state.items, ...next.items.filter((routine) => !seen.has(routine.id))],
        page: state.page + 1,
        hasNext: next.pagination.hasNext,
        loadingMore: false,
      });
    } catch {
      setState({ ...state, loadingMore: false });
    }
  };

  if (state.status === "loading") return null;
  if (state.status === "error") {
    return (
      <ErrorState
        variant="screen"
        icon={<Icon name="alert-circle" size={28} />}
        title="루틴을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: "loading" });
              loadFirst();
            }}
          >
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
    <div className="flex flex-col gap-3 px-gutter pt-4 pb-6">
      <ul className="flex flex-col gap-3">
        {state.items.map((routine) => (
          <li key={routine.id}>
            <SharedRoutineCard routine={routine} />
          </li>
        ))}
      </ul>
      {state.hasNext ? (
        <Button variant="secondary" busy={state.loadingMore} onClick={loadMore}>
          더 보기
        </Button>
      ) : null}
    </div>
  );
}
