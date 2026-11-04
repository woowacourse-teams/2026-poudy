"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import { TopBar } from "@poudy/design-system/top-bar";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoutineBrowseList } from "./RoutineBrowseList";
import { RoutineCard } from "./RoutineCard";
import { RoutineCreateSheet } from "./RoutineCreateSheet";
import { RoutineLoginSheet } from "./RoutineLoginSheet";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { RETRY_LATER } from "@/lib/domain/messages";
import { useMyRoutines } from "@/lib/hooks/useRoutines";

type RoutineTab = "mine" | "browse";

/** 루틴(/routine). 내 루틴과 둘러보기 탭을 둔다(RT1·RT2). 로그인하지 않아도 들어올 수 있다. */
export function RoutineScreen() {
  const router = useRouter();
  const { state, retry } = useMyRoutines();
  const [tab, setTab] = useState<RoutineTab>("mine");
  const [creating, setCreating] = useState(false);
  const [loginAsked, setLoginAsked] = useState(false);

  const startCreate = () => {
    if (state.status === "signedOut") {
      setLoginAsked(true);
      return;
    }
    setCreating(true);
  };

  const created = (routine: RoutineResponse) => {
    setCreating(false);
    router.push(`/routine/${routine.id}`);
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
        <main aria-busy={state.status === "loading" || undefined} className="flex flex-1 flex-col">
          <Tabs value={tab} onValueChange={(value) => setTab(value === "browse" ? "browse" : "mine")} layout="fixed">
            <div className="px-gutter">
              <TabList label="루틴 보기">
                <Tab value="mine">
                  <TabLabel>내 루틴</TabLabel>
                </Tab>
                <Tab value="browse">
                  <TabLabel>둘러보기</TabLabel>
                </Tab>
              </TabList>
            </div>
            <TabPanel value="mine" className="flex flex-1 flex-col">
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
                <ul className="flex flex-col gap-3 px-gutter pt-4 pb-6">
                  {state.data.items.map((routine) => (
                    <li key={routine.id}>
                      <RoutineCard routine={routine} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </TabPanel>
            <TabPanel value="browse" className="flex flex-1 flex-col">
              <RoutineBrowseList />
            </TabPanel>
          </Tabs>
        </main>
      </ScreenBody>
      <RoutineCreateSheet open={creating} onClose={() => setCreating(false)} onCreated={created} />
      <RoutineLoginSheet open={loginAsked} onClose={() => setLoginAsked(false)} />
    </Screen>
  );
}
