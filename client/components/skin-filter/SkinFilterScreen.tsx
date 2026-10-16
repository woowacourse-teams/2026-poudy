"use client";

import type { IngredientAnalysisItemResponse, SkinFilterIngredientResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SkinFilterRow } from "./SkinFilterRow";
import { UndoToast } from "./UndoToast";
import { useSkinFilterEditor } from "./useSkinFilterEditor";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { Icon } from "@/components/ui/icons/Icon";
// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";
import { formulationRolesLine } from "@/lib/domain/skin-filter";

/** 성분을 어디서 찾는지 알리고 선반으로 보내는 안내(S55j 안내). */
function ShelfNotice() {
  const { pressableProps } = usePressable();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3">
      <Icon name="info" size={16} strokeWidth={1.33} className="shrink-0 text-text-secondary" />
      <p className="min-w-0 flex-1 text-body-sm text-text-secondary">
        선반에서 &apos;안 맞았어요&apos;로 평가한 제품을 바탕으로 성분을 찾아요.
      </p>
      <Link
        href="/shelf"
        {...pressableProps}
        className="pressable fb-border -my-3 -mr-4 flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg px-4 text-body-sm font-semibold text-text-primary"
      >
        선반 보기
        <Icon name="chevron-right" size={16} strokeWidth={1.33} />
      </Link>
    </div>
  );
}

/** 목록 위 묶음 이름. 넣지 않은 성분이 함께 보일 때만 두 묶음을 가른다. */
function GroupHeading({ children }: { readonly children: string }) {
  return <h2 className="pt-2 text-caption font-semibold text-text-secondary">{children}</h2>;
}

type FilterListsProps = {
  readonly filter: readonly SkinFilterIngredientResponse[];
  readonly candidates: readonly IngredientAnalysisItemResponse[];
  readonly onRemove: (item: SkinFilterIngredientResponse) => void;
  readonly onAdd: (item: IngredientAnalysisItemResponse) => void;
};

function FilterLists({ filter, candidates, onRemove, onAdd }: FilterListsProps) {
  const grouped = candidates.length > 0;

  return (
    <>
      {filter.length > 0 ? (
        <section aria-label="필터에 있는 성분">
          {grouped ? <GroupHeading>필터에 있는 성분</GroupHeading> : null}
          <ul className="flex flex-col pt-1">
            {filter.map((item) => (
              <SkinFilterRow
                key={item.id}
                name={item.koreanName}
                note={formulationRolesLine(item)}
                effects={item.skinEffects}
                action="remove"
                onAction={() => onRemove(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {grouped ? (
        <section aria-label="선반에서 찾았지만 넣지 않은 성분">
          <GroupHeading>선반에서 찾았지만 넣지 않은 성분</GroupHeading>
          <ul className="flex flex-col pt-1">
            {candidates.map((item) => (
              <SkinFilterRow key={item.id} name={item.koreanName} action="add" onAction={() => onAdd(item)} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** 필터가 빈 화면. 성분은 선반 평가에서 찾으므로 선반으로 보낸다. */
function EmptyFilter() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-body text-text-secondary">선반에서 안 맞은 제품을 평가하면 성분을 찾아 드려요</p>
      <Button variant="secondary" onClick={() => router.push("/shelf")}>
        선반으로 가기
      </Button>
    </div>
  );
}

/**
 * 나만의 필터(/my-page/filter, S55j·S55j-1). 선반에서 넣은 검색 제외 성분을 빼거나, 넣지 않은 성분을 넣는다.
 * 켜고 끄기는 이 화면에 두지 않는다. 검색 화면에서 그때그때 해제한다.
 */
export function SkinFilterScreen() {
  const { status, filter, candidates, toast, retry, remove, add, dismissToast } = useSkinFilterEditor();
  const empty = filter.length === 0 && candidates.length === 0;

  return (
    <>
      <TopBar title="나만의 필터" variant="sub" />
      <main className="flex flex-1 flex-col">
        {/* TODO(#728): 불러오는 동안 스켈레톤을 둔다. 지금은 빈 본문이다. */}
        {status === "adminSession" ? <AdminSessionNotice className="px-gutter pt-4" /> : null}
        {status === "error" ? (
          // TODO(#728): 화면 오류(ErrorState, S51)로 바꾼다. 지금은 문구와 다시 시도 버튼만 둔다.
          <div role="alert" className="flex flex-col items-center gap-3 px-gutter py-16 text-center">
            <p className="text-body text-text-secondary">나만의 필터를 불러오지 못했어요</p>
            <Button variant="secondary" onClick={retry}>
              다시 시도
            </Button>
          </div>
        ) : null}
        {status === "ready" && empty ? (
          <div className="px-gutter">
            <EmptyFilter />
          </div>
        ) : null}
        {status === "ready" && !empty ? (
          <div className="flex flex-col gap-5 px-gutter pt-4 pb-6">
            <FilterLists filter={filter} candidates={candidates} onRemove={remove} onAdd={add} />
            <ShelfNotice />
          </div>
        ) : null}
        <div className="flex-1" />
        <UndoToast toast={toast} onDismiss={dismissToast} />
      </main>
    </>
  );
}
