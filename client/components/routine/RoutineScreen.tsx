"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TopBar } from "@poudy/design-system/top-bar";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MyRoutineRow } from "./MyRoutineRow";
import { RoutineBrowseList } from "./RoutineBrowseList";
import { RoutineCreateSheet } from "./RoutineCreateSheet";
import { RoutineHelpSheet } from "./RoutineHelpSheet";
import { RoutineLoginSheet } from "./RoutineLoginSheet";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { newFeatureFlow } from "@/lib/analytics/feature-flow";
import { startRoutineCreation } from "@/lib/analytics/routine";
import { useMyRoutines } from "@/lib/hooks/useRoutines";

/**
 * 루틴 탭(/routines, S173~S180). 로그인 여부와 상관없이 한 화면이다. 위는 내 루틴 줄, 아래는 둘러보기다.
 * 상단 오른쪽은 '+' 대신 도움말(?)로 '루틴 이용 안내' 시트를 연다. 만들기 입구는 줄 끝 '새 루틴' 카드 하나다.
 */
export function RoutineScreen() {
  const router = useRouter();
  // 내 루틴 줄은 첫 쪽만 보이고 위치를 기억하지 않는다. 스크롤 위치는 둘러보기 목록이 기억한다.
  const { state, retry } = useMyRoutines({ remember: false });
  const [creating, setCreating] = useState(false);
  const [loginAsked, setLoginAsked] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [flow] = useState(() => newFeatureFlow("routine", "mine"));
  // 한 화면이 된 뒤에도 이벤트 이름은 그대로 두고, 내 루틴 줄이 보이면 mine 으로 남긴다.
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
      <TopBar
        variant="large"
        title="루틴"
        actions={[
          {
            icon: "help-circle",
            label: "루틴 이용 안내",
            onClick: () => setHelpOpen(true),
            haspopup: "dialog",
            expanded: helpOpen,
          },
        ]}
      />
      <ScreenBody>
        <main className="flex flex-1 flex-col">
          <MyRoutineRow state={state} flow={flow} onCreate={startCreate} onRetry={retry} />
          <RoutineBrowseList />
        </main>
      </ScreenBody>
      <RoutineHelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      <RoutineCreateSheet open={creating} onClose={() => setCreating(false)} onCreated={created} />
      <RoutineLoginSheet open={loginAsked} onClose={() => setLoginAsked(false)} />
    </Screen>
  );
}
