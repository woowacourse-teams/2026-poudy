"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TabNav, TabNavItem } from "@poudy/design-system/tab-nav";
import { TopBar } from "@poudy/design-system/top-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RoutineBrowseList } from "./RoutineBrowseList";
import { RoutineCard } from "./RoutineCard";
import { RoutineCreateSheet } from "./RoutineCreateSheet";
import { RoutineListEnd } from "./RoutineListEnd";
import { RoutineLoginSheet } from "./RoutineLoginSheet";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { newFeatureFlow } from "@/lib/analytics/feature-flow";
import { startRoutineCreation } from "@/lib/analytics/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { usePendingTab } from "@/lib/hooks/usePendingTab";
import { useMyRoutines } from "@/lib/hooks/useRoutines";

type RoutineTab = "mine" | "browse";

/** /routines는 로그인 상태에 맞는 주소로 이동하는 기존 진입점이다. */
export function RoutineScreen({ tab }: { readonly tab?: RoutineTab }) {
  const router = useRouter();
  // 다음 탭을 받는 동안에도 누른 탭을 먼저 고른 것으로 보인다. 밑줄이 누른 자리에서 바로 옮겨 간다.
  const [shownTab, navigateTab] = usePendingTab(tab);
  const { state, retry, loadMore } = useMyRoutines({ remember: tab === "mine" });
  const [creating, setCreating] = useState(false);
  const [loginAsked, setLoginAsked] = useState(false);
  const [flow] = useState(() => newFeatureFlow("routine", "mine"));
  useTrackedView(
    "routine_list_viewed",
    { ...flow, list_type: "mine", result_count: state.status === "ready" ? state.data.total : 0 },
    { key: flow.feature_flow_id, enabled: tab === "mine" && state.status === "ready" },
  );

  useEffect(() => {
    if (!tab && state.status !== "loading") {
      router.replace(state.status === "signedOut" ? "/routines/feed" : "/routines/my");
    }
  }, [router, state.status, tab]);

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
      <TopBar
        variant="large"
        title="루틴"
        edge={false}
        actions={[
          { icon: "plus", label: "새 루틴 만들기", onClick: startCreate, haspopup: "dialog", expanded: creating },
        ]}
      />
      <ScreenBody>
        <main aria-busy={(tab === "mine" && state.status === "loading") || undefined} className="flex flex-1 flex-col">
          {tab && (
            <>
              <div data-routine-tabs className="sticky top-16 z-(--z-sticky) bg-background px-gutter">
                <TabNav aria-label="루틴 보기" slide>
                  <TabNavItem current={shownTab === "mine"}>
                    <Link href="/routines/my" onNavigate={navigateTab("mine", "/routines/my")}>
                      내 루틴
                    </Link>
                  </TabNavItem>
                  <TabNavItem current={shownTab === "browse"}>
                    <Link href="/routines/feed" onNavigate={navigateTab("browse", "/routines/feed")}>
                      둘러보기
                    </Link>
                  </TabNavItem>
                </TabNav>
              </div>
              <div className="routine-tab-runway flex flex-1 scroll-mt-27 flex-col">
                {tab === "mine" ? (
                  <div className="flex flex-1 flex-col">
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
                      <div className="flex flex-col gap-3 px-gutter pt-4 pb-inquiry">
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
                  </div>
                ) : (
                  <RoutineBrowseList />
                )}
              </div>
            </>
          )}
        </main>
      </ScreenBody>
      <RoutineCreateSheet open={creating} onClose={() => setCreating(false)} onCreated={created} />
      <RoutineLoginSheet open={loginAsked} onClose={() => setLoginAsked(false)} />
    </Screen>
  );
}
