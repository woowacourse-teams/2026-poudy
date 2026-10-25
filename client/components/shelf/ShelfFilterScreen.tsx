"use client";

import type { IngredientAnalysisItemResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { cn } from "@poudy/design-system/cn";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useToast } from "@poudy/design-system/toast";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { shelfAnalysisRevision, requestShelfLogin } from "@/lib/analytics/shelf";
import { track } from "@/lib/analytics/track";
import { isSignedOut } from "@/lib/api/member";
import { addMyFilterIngredients } from "@/lib/api/my-filter";
import { fetchIngredientAnalysis } from "@/lib/api/shelf";
import {
  excludeGuide,
  excludeRowNote,
  ingredientsToExclude,
  initialExcludeSelection,
  isMarkedNew,
} from "@/lib/domain/shelf";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly items: readonly IngredientAnalysisItemResponse[];
      readonly analysisRevision: string;
    };

type ExcludeFormProps = {
  readonly items: readonly IngredientAnalysisItemResponse[];
  readonly analysisRevision: string;
};

function ExcludeForm({ items, analysisRevision }: ExcludeFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<readonly string[]>(() => initialExcludeSelection(items).map(String));
  const [busy, setBusy] = useState(false);
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("shelf_filter_selection_viewed", {
      analysis_revision: analysisRevision,
      candidate_count: items.filter((item) => !item.inFilter).length,
      preselected_count: ingredientsToExclude(items, initialExcludeSelection(items)).length,
    });
  }, [items, analysisRevision]);
  const toExclude = ingredientsToExclude(items, selected.map(Number));
  const markNew = items.some((item) => item.inFilter);

  const submit = () => {
    setBusy(true);
    addMyFilterIngredients(toExclude, {
      source: "shelf_filter",
      analysisRevision,
      selectionChanged: [...selected].sort().join(",") !== initialExcludeSelection(items).map(String).sort().join(","),
    }).then(
      () => {
        // 토스트는 앱 레이아웃에 있어 선반으로 옮겨 가도 남는다(S53e·S53k). 명세의 두 토스트 모두 되돌리기가 없다.
        toast.show({
          message: `성분 ${toExclude.length}개를 나만의 필터에 ${markNew ? "더 " : ""}넣었어요`,
        });
        router.push("/shelf");
      },
      () => {
        setBusy(false);
        toast.show({ message: "나만의 필터에 넣지 못했어요. 잠시 후 다시 시도해 주세요." });
      },
    );
  };

  return (
    <>
      <ScreenBody>
        <main className="flex flex-1 flex-col pb-6">
          <div className="flex flex-col gap-2 px-gutter pt-4">
            <h2 id="exclude-title" className="text-screen leading-snug font-bold text-text-primary">
              검색할 때 뺄 성분을 골라 주세요
            </h2>
            <p className="text-body leading-normal whitespace-pre-line text-text-secondary">{excludeGuide(items)}</p>
          </div>

          <div className="px-gutter pt-5">
            <CheckboxGroup aria-labelledby="exclude-title" divided value={selected} onValueChange={setSelected}>
              {items.map((item) => (
                <CheckboxGroupItem
                  key={item.id}
                  value={String(item.id)}
                  disabled={item.inFilter}
                  description={
                    <span className={cn(isMarkedNew(item, markNew) && "font-semibold text-brand-text")}>
                      {excludeRowNote(item, markNew)}
                    </span>
                  }
                >
                  {item.koreanName}
                </CheckboxGroupItem>
              ))}
            </CheckboxGroup>
          </div>
        </main>
      </ScreenBody>
      {/* data-toast-offset 은 토스트가 이 영역 위에 뜨도록 globals.css 가 높이를 고르는 데 쓴다. */}
      <div data-toast-offset="action-bar" className="contents">
        <BottomActionBar
          position="screen-end"
          action={{
            // 고른 성분이 없으면 버튼 글자가 할 일을 말한다(S53c).
            label: toExclude.length === 0 ? "성분을 골라 주세요" : `성분 ${toExclude.length}개 추가하기`,
            onClick: submit,
            busy,
            disabled: toExclude.length === 0,
          }}
        />
      </div>
    </>
  );
}

/** 성분을 불러오는 동안의 자리. 제목 두 줄과 성분 행 셋을 같은 크기로 채운다(F02). */
function ExcludeSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-gutter pt-2">
      <div className="flex flex-col gap-2">
        <Skeleton shape="line" size={20} className="w-60 max-w-full" />
        <Skeleton shape="line" size={13} className="w-full" />
        <Skeleton shape="line" size={13} className="w-40" />
      </div>
      <div className="flex flex-col">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3 border-b border-border py-3">
            <Skeleton shape="box" className="size-5" />
            <Skeleton shape="line" size={15} className="w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 검색에서 제외할 성분 고르기(/shelf/filter, S53c·S53d·S53j). */
export function ShelfFilterScreen() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const loading = state.status === "loading";
  // 빠르게 끝나는 요청에는 스켈레톤을 띄우지 않는다(F02).
  const showSkeleton = useDelayedFlag(loading);

  const load = useCallback(
    () =>
      fetchIngredientAnalysis().then(
        (analysis) =>
          setState({ status: "ready", items: analysis.items, analysisRevision: shelfAnalysisRevision(analysis) }),
        (error: unknown) => {
          if (!isSignedOut(error)) return setState({ status: "error" });
          rememberLoginReturn();
          requestShelfLogin();
          router.replace("/login");
        },
      ),
    [router],
  );

  // 화면에 들어올 때 한 번 서버에서 성분을 읽는다. 외부 데이터와 맞추는 일이라 effect 로 둔다.
  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setState({ status: "loading" });
    void load();
  };

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar title="나만의 필터에 추가" />
      {state.status === "ready" ? (
        <ExcludeForm items={state.items} analysisRevision={state.analysisRevision} />
      ) : (
        <ScreenBody>
          <main aria-busy={loading || undefined} className="flex flex-1 flex-col">
            {loading && showSkeleton ? <ExcludeSkeleton /> : null}
            {state.status === "error" ? (
              <ErrorState
                variant="screen"
                icon={<Icon name="alert-circle" size={28} />}
                title="성분을 불러오지 못했어요"
                description={"잠시 후 다시 시도해 주세요.\n문제가 이어지면 잠시 뒤에 다시 들러 주세요."}
                action={
                  <Button variant="secondary" onClick={retry}>
                    다시 시도
                  </Button>
                }
                className="flex-1"
              />
            ) : null}
          </main>
        </ScreenBody>
      )}
    </Screen>
  );
}
