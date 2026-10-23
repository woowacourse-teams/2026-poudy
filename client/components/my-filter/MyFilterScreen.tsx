"use client";

import type { IngredientAnalysisItemResponse, MyFilterIngredientResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { MyFilterRow } from "./MyFilterRow";
import { useMyFilterEditor } from "./useMyFilterEditor";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { isExcludeCode } from "@/lib/domain/filter";

/** 성분을 어디서 찾는지 알리고 선반으로 보내는 안내(S55j 안내). */
function ShelfNotice() {
  const { pressableProps } = usePressable();

  return (
    // 글자가 커져 문구 칸이 최소 폭(144px)보다 좁아지면 [선반 보기]를 다음 줄 끝으로 내린다.
    // 320 화면의 기본 배율에서는 한 줄에 들어가는 폭이다.
    // [선반 보기]의 누르는 영역이 틀의 오른쪽과 위아래 끝까지 닿도록, 틀은 왼쪽만 비우고 위아래 여백은 문구 칸에 둔다.
    <div className="flex flex-wrap items-center justify-end gap-x-2 rounded-lg bg-surface pl-4">
      <div className="flex min-w-36 flex-1 items-center gap-2 py-3 text-body-sm">
        <Icon name="info-circle" size={16} scalable className="text-text-secondary" />
        <p className="min-w-0 flex-1 text-text-secondary">
          선반에서 &apos;안 맞았어요&apos;로 평가한 제품을 바탕으로 성분을 찾아요.
        </p>
      </div>
      <Link
        href="/shelf"
        {...pressableProps}
        className="pressable fb-border flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg px-4 text-body-sm font-semibold text-text-primary"
      >
        선반 보기
        <Icon name="chevron-right" size={16} scalable />
      </Link>
    </div>
  );
}

/** 묶음 머리. 묶음 이름 뒤에 성분 수를 붙인다. 예: '검색에서 제외 중 · 3' */
function GroupHeading({ title, count }: { readonly title: string; readonly count: number }) {
  return <h2 className="pb-1 text-caption font-semibold text-text-secondary">{`${title} · ${count}`}</h2>;
}

const FILTER_GROUP = "검색에서 제외 중";
const CANDIDATE_GROUP = "선반에서 찾았지만 넣지 않은 성분";

type FilterListsProps = {
  readonly filter: readonly MyFilterIngredientResponse[];
  readonly candidates: readonly IngredientAnalysisItemResponse[];
  /**
   * 필터에서 뺀 성분의 효과. 넣지 않은 성분 행의 효과 아이콘에 쓴다.
   * 선반 결과 응답에는 효과가 없어, 이 화면에서 한 번도 필터에 든 적 없는 성분은 효과 아이콘을 비운다.
   */
  readonly known: ReadonlyMap<number, MyFilterIngredientResponse>;
  readonly onRemove: (item: MyFilterIngredientResponse) => void;
  readonly onAdd: (item: IngredientAnalysisItemResponse) => void;
};

function FilterLists({ filter, candidates, known, onRemove, onAdd }: FilterListsProps) {
  return (
    <>
      {filter.length > 0 ? (
        <section aria-label={FILTER_GROUP}>
          <GroupHeading title={FILTER_GROUP} count={filter.length} />
          <ul className="flex flex-col pt-1">
            {filter.map((item) => (
              <MyFilterRow
                key={item.id}
                name={item.koreanName}
                cautionCodes={item.excludeCodes}
                effects={item.skinEffects}
                formulationRoles={item.formulationRoles}
                action="remove"
                onAction={() => onRemove(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {candidates.length > 0 ? (
        <section aria-label={CANDIDATE_GROUP}>
          <GroupHeading title={CANDIDATE_GROUP} count={candidates.length} />
          <ul className="flex flex-col pt-1">
            {candidates.map((item) => (
              <MyFilterRow
                key={item.id}
                name={item.koreanName}
                cautionCodes={item.groupCodes.filter(isExcludeCode)}
                effects={known.get(item.id)?.skinEffects}
                formulationRoles={item.formulationRoles}
                action="add"
                onAction={() => onAdd(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** 필터가 빈 화면(S55j-2). 성분은 선반 평가에서 찾으므로 선반으로 보낸다. 남은 자리의 가운데에 둔다. */
function EmptyFilter() {
  const router = useRouter();

  return (
    <EmptyState
      icon={<Icon name="user-check" size={28} />}
      title="아직 나만의 필터에 넣은 성분이 없어요"
      description={"선반에서 '안 맞았어요'로 평가하면\n함께 든 성분을 찾아 여기에 넣을 수 있어요"}
      action={
        <Button variant="secondary" onClick={() => router.push("/shelf")}>
          선반 보기
        </Button>
      }
      className="flex-1"
    />
  );
}

/** 처음 불러오는 동안의 자리. 묶음 머리와 성분 행 셋을 같은 크기로 채운다(F02). */
function FilterSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-gutter pt-4">
      <Skeleton shape="line" size={12} className="w-24" />
      <div className="flex flex-col pt-1">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3 border-b border-border py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton shape="line" size={16} className="w-20" />
              <Skeleton shape="line" size={13} className="w-12" />
            </div>
            <Skeleton shape="circle" className="size-9" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 나만의 필터(/my-page/filter, S55j·S55j-1·S55j-3). 선반에서 넣은 검색 제외 성분을 빼거나, 넣지 않은 성분을 넣는다.
 * 켜고 끄기는 이 화면에 두지 않는다. 검색 화면에서 그때그때 해제한다.
 */
export function MyFilterScreen() {
  // 되돌리기를 마친 뒤 포커스를 돌려줄 자리. 누른 행의 버튼은 사라지거나 다른 묶음으로 옮겨 간다.
  const listRef = useRef<HTMLDivElement>(null);
  const { status, filter, candidates, known, retry, remove, add } = useMyFilterEditor(listRef);
  const empty = filter.length === 0 && candidates.length === 0;
  const loading = status === "loading";
  // 빠르게 끝나는 요청에는 스켈레톤을 띄우지 않는다(F02).
  const showSkeleton = useDelayedFlag(loading);

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar title="나만의 필터" />
      <ScreenBody>
        <main aria-busy={loading || undefined} className="flex flex-1 flex-col">
          {loading && showSkeleton ? <FilterSkeleton /> : null}
          {status === "adminSession" ? <AdminSessionNotice className="px-gutter pt-4" /> : null}
          {status === "error" ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="나만의 필터를 불러오지 못했어요"
              description={"잠시 후 다시 시도해 주세요.\n문제가 이어지면 잠시 뒤에 다시 들러 주세요."}
              action={
                <Button variant="secondary" onClick={retry}>
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          ) : null}
          {status === "ready" && empty ? (
            <div className="flex flex-1 flex-col px-gutter">
              <EmptyFilter />
            </div>
          ) : null}
          {status === "ready" && !empty ? (
            <div ref={listRef} tabIndex={-1} className="flex flex-col gap-5 px-gutter pt-4 pb-6 outline-none">
              <FilterLists filter={filter} candidates={candidates} known={known} onRemove={remove} onAdd={add} />
              <ShelfNotice />
            </div>
          ) : null}
        </main>
      </ScreenBody>
    </Screen>
  );
}
