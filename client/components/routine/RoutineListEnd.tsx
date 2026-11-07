"use client";

import { LoadMore } from "@poudy/design-system/load-more";

const MESSAGES = {
  loading: (loaded: string, total: string) => `${loaded} / ${total} · 다음 루틴 불러오는 중`,
  failed: "다음 루틴을 불러오지 못했어요",
  next: "다음 루틴 보기",
};

type RoutineListEndProps = {
  readonly hasNext: boolean;
  readonly loadingMore: boolean;
  readonly moreFailed: boolean;
  readonly loadedCount: number;
  readonly totalCount: number;
  readonly onLoadMore: () => void;
};

const statusOf = ({ hasNext, loadingMore, moreFailed }: RoutineListEndProps) => {
  if (!hasNext) return "end";
  if (moreFailed) return "failed";
  if (loadingMore) return "loading";
  return "idle";
};

/** 루틴 목록 끝. 보이면 다음 쪽을 부르고, 실패하면 다시 시도 버튼을 둔다. */
export function RoutineListEnd(props: RoutineListEndProps) {
  return (
    <LoadMore
      direction="next"
      status={statusOf(props)}
      loadedCount={props.loadedCount}
      totalCount={props.totalCount}
      onLoad={props.onLoadMore}
      onRetry={props.onLoadMore}
      messages={MESSAGES}
    />
  );
}
