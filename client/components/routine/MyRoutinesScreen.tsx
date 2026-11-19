"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoutineCard } from "./RoutineCard";
import { RoutineCreateSheet } from "./RoutineCreateSheet";
import { RoutineListEnd } from "./RoutineListEnd";
import { RoutineLoginSheet } from "./RoutineLoginSheet";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { newFeatureFlow } from "@/lib/analytics/feature-flow";
import { startRoutineCreation } from "@/lib/analytics/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { useMyRoutines } from "@/lib/hooks/useRoutines";

/**
 * 내 루틴 전체 보기(/routines/my, S183). 루틴 탭의 '전체 보기'로 여는 하위 화면이라 하단 내비가 없다.
 * 만들기 입구는 상단 '+' 하나다. 카드는 사진 판 카드 세로 목록이고, 끝에 닿으면 다음 쪽을 이어 붙인다.
 */
export function MyRoutinesScreen() {
  const router = useRouter();
  const { state, retry, loadMore } = useMyRoutines();
  const [creating, setCreating] = useState(false);
  const [loginAsked, setLoginAsked] = useState(false);
  const [flow] = useState(() => newFeatureFlow("routine", "mine"));
  useTrackedView(
    "routine_list_viewed",
    { ...flow, list_type: "mine", result_count: state.status === "ready" ? state.data.total : 0 },
    { key: flow.feature_flow_id, enabled: state.status === "ready" },
  );

  const startCreate = () => {
    if (state.status === "signedOut") {
      setLoginAsked(true);
      return;
    }
    startRoutineCreation();
    setCreating(true);
  };

  const created = (routine: RoutineResponse) => {
    setCreating(false);
    router.push(`/routines/${routine.id}`);
  };

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar
        title="내 루틴"
        fallback={{ href: "/routines", label: "루틴으로" }}
        action={{ icon: "plus", label: "새 루틴 만들기", onClick: startCreate, haspopup: "dialog", expanded: creating }}
      />
      <ScreenBody>
        <main aria-busy={state.status === "loading" || undefined} className="flex flex-1 flex-col">
          {state.status === "adminSession" ? <AdminSessionNotice className="px-gutter pt-4" /> : null}
          {state.status === "error" ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="루틴을 불러오지 못했어요"
              description={RETRY_LATER}
              action={
                <Button variant="secondary" onClick={retry}>
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          ) : null}
          {state.status === "signedOut" || (state.status === "ready" && state.data.items.length === 0) ? (
            <EmptyState
              icon={<Icon name="sun-moon" size={28} />}
              title="아직 만든 루틴이 없어요"
              description={"아침과 저녁에 쓰는 제품을 순서대로 묶어 두세요.\n루틴은 여러 개 만들 수 있어요."}
              action={
                <Button variant="secondary" onClick={startCreate}>
                  루틴 만들기
                </Button>
              }
              className="flex-1"
            />
          ) : null}
          {state.status === "ready" && state.data.items.length > 0 ? (
            <div className="flex flex-col gap-3 px-gutter pt-2 pb-inquiry">
              <ul className="flex flex-col gap-3">
                {state.data.items.map((routine) => (
                  <li key={routine.id} data-scroll-anchor={routine.id}>
                    <RoutineCard routine={routine} flow={flow} />
                  </li>
                ))}
              </ul>
              <RoutineListEnd
                hasNext={state.data.hasNext}
                loadingMore={state.data.loadingMore}
                moreFailed={state.data.moreFailed}
                loadedCount={state.data.items.length}
                totalCount={state.data.total}
                onLoadMore={loadMore}
              />
            </div>
          ) : null}
        </main>
      </ScreenBody>
      <RoutineCreateSheet open={creating} onClose={() => setCreating(false)} onCreated={created} />
      <RoutineLoginSheet open={loginAsked} onClose={() => setLoginAsked(false)} />
    </Screen>
  );
}
