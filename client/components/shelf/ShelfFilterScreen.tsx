"use client";

import type { IngredientAnalysisItemResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { CheckboxGroup, CheckboxGroupItem } from "@poudy/design-system/checkbox-group";
import { cn } from "@poudy/design-system/cn";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";
import { isSignedOut } from "@/lib/api/member";
import { fetchIngredientAnalysis } from "@/lib/api/shelf";
import { addSkinFilterIngredients } from "@/lib/api/skin-filter";
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
  | { readonly status: "ready"; readonly items: readonly IngredientAnalysisItemResponse[] };

type ExcludeFormProps = {
  readonly items: readonly IngredientAnalysisItemResponse[];
};

function ExcludeForm({ items }: ExcludeFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<readonly string[]>(() => initialExcludeSelection(items).map(String));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const toExclude = ingredientsToExclude(items, selected.map(Number));
  const markNew = items.some((item) => item.inFilter);

  const submit = () => {
    setBusy(true);
    setFailed(false);
    // TODO(#728): 선반으로 돌아가 '이제 검색할 때 성분 N개가 든 제품을 빼고 보여 드려요 · 되돌리기' 토스트를 띄운다(S53e·S53k).
    addSkinFilterIngredients(toExclude).then(
      () => router.push("/shelf"),
      () => {
        setBusy(false);
        setFailed(true);
      },
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2 px-gutter pt-2">
        <h2 id="exclude-title" className="text-screen font-bold text-text-primary">
          검색할 때 뺄 성분을 골라 주세요
        </h2>
        <p className="text-body-sm whitespace-pre-line text-text-secondary">{excludeGuide(items)}</p>
      </div>

      <div className="px-gutter pt-4">
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

      <div className="flex-1" />
      {/* TODO(#729): 하단 행동 영역(BottomActionBar)이 들어오면 그 안에 둔다. 지금은 본문 끝에 붙인다. */}
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background px-gutter pt-3 pb-safe">
        {failed ? (
          <p role="alert" className="text-caption text-danger-action">
            검색 제외에 넣지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        ) : null}
        <Button size="lg" className="w-full" disabled={toExclude.length === 0} busy={busy} onClick={submit}>
          {`성분 ${toExclude.length}개 제외하기`}
        </Button>
      </div>
    </>
  );
}

/** 검색에서 제외할 성분 고르기(/shelf/filter, S53c·S53d·S53j). */
export function ShelfFilterScreen() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    fetchIngredientAnalysis().then(
      (analysis) => setState({ status: "ready", items: analysis.items }),
      (error: unknown) => {
        if (!isSignedOut(error)) return setState({ status: "error" });
        rememberLoginReturn();
        router.replace("/login");
      },
    );
  }, [router]);

  return (
    <>
      <TopBar title="검색에서 제외" variant="sub" />
      <main className="flex flex-1 flex-col">
        {/* TODO(#728): 불러오는 동안 스켈레톤, 실패하면 화면 오류(ErrorState)를 둔다. */}
        {state.status === "error" ? (
          <p role="alert" className="px-gutter py-16 text-center text-body text-text-secondary">
            성분을 불러오지 못했어요
          </p>
        ) : null}
        {state.status === "ready" ? <ExcludeForm items={state.items} /> : null}
      </main>
    </>
  );
}
