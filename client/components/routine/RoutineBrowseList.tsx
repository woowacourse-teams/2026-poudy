"use client";

import { SharedRoutineSort, type SharedRoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Skeleton } from "@poudy/design-system/skeleton";
import { Tag } from "@poudy/design-system/tag";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { RoutineListEnd } from "./RoutineListEnd";
import { type PhotoCardRoutine, RoutinePhotoCard } from "./RoutinePhotoCard";
import { RoutineSortChips } from "./RoutineSortChips";
import { SharedRoutineCard } from "./SharedRoutineCard";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import type { FeatureFlow } from "@/lib/analytics/events";
import { newFeatureFlow } from "@/lib/analytics/feature-flow";
import { fetchSharedRoutines } from "@/lib/api/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { useRoutinePages, type RoutineListState } from "@/lib/hooks/useRoutinePages";
import { sharedRoutinePages } from "@/lib/storage/routine-pages-cache";

/**
 * 공개 루틴이 하나도 없을 때 보이는 예시 루틴(S179). 클라이언트에 적어 두고, 누를 수 없고 수도 없다.
 * 예시 제품은 정하지 않아 기본 공병 그림으로 둔다.
 */
const EXAMPLE_ROUTINES: readonly PhotoCardRoutine[] = [
  {
    name: "트러블 진정 저녁",
    morning: [
      { id: 1, imageUrl: "" },
      { id: 2, imageUrl: "" },
    ],
    evening: [
      { id: 3, imageUrl: "" },
      { id: 4, imageUrl: "" },
      { id: 5, imageUrl: "" },
    ],
  },
  { name: "가볍게 끝내는 아침", morning: [{ id: 6, imageUrl: "" }], evening: [] },
];

/**
 * 루틴 탭의 둘러보기(S173 아래쪽). 정렬을 방문 기록(/routines?sort=)에 남겨 링크 진입과 뒤로가기가 같은 목록을 가리키게 한다.
 */
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
    path: `/routines?sort=${sort}`,
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

  // 공개 루틴이 없으면 예시만 두어 정렬이 뜻이 없다(S179).
  const empty = state.status === "ready" && state.data.items.length === 0;

  return (
    <section aria-labelledby="routine-browse-title" className="flex flex-1 flex-col">
      <h2 id="routine-browse-title" className="px-gutter pt-6 text-section font-bold text-text-primary">
        둘러보기
      </h2>
      {empty ? null : (
        <div className="px-gutter pt-3">
          <RoutineSortChips value={sort} onValueChange={changeSort} />
        </div>
      )}
      <BrowseBody state={state} flow={flow} onRetry={retry} onLoadMore={loadMore} />
    </section>
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
  if (state.status === "loading") return <BrowseSkeleton />;
  if (state.status === "signedOut" || state.status === "adminSession") return null;
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
  if (list.items.length === 0) return <ExampleRoutines />;

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

/** 둘러보기를 불러오는 동안의 자리(S176). 사진 판 카드 모양 두 장. */
function BrowseSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 px-gutter pt-3 pb-inquiry">
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col overflow-hidden rounded-lg border border-border">
          <Skeleton shape="card" className="h-30 w-full" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton shape="line" size={14} className="w-35" />
            <Skeleton shape="line" size={12} className="w-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 공개된 루틴이 없을 때(S179). 빈 화면 대신 안내 한 줄과 누를 수 없는 예시 카드 두 장을 둔다. */
function ExampleRoutines() {
  return (
    <div className="flex flex-col gap-3 px-gutter pt-3 pb-inquiry">
      <div className="flex flex-col gap-0.5">
        <p className="text-title font-semibold text-text-primary">아직 공개된 루틴이 없어요</p>
        <p className="text-body-sm text-text-secondary">이런 루틴을 만들 수 있어요. 아래는 예시예요.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {EXAMPLE_ROUTINES.map((routine) => (
          <li key={routine.name}>
            <RoutinePhotoCard
              routine={routine}
              nameTag={
                <Tag variant="label" tone="muted">
                  예시
                </Tag>
              }
              footer={<span className="text-caption text-text-secondary">파우디가 만든 예시 루틴</span>}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
