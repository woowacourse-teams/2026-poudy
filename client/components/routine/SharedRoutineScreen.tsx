"use client";

import type { RoutineResponse, SharedRoutineResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { ScreenBody } from "@poudy/design-system/screen";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { RoutineProductList } from "./RoutineProductList";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { isSignedOut } from "@/lib/api/member";
import { importRoutine } from "@/lib/api/routine";
import { josaOf } from "@/lib/domain/format";
import { TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";
import { useSharedRoutine } from "@/lib/hooks/useRoutines";
import { rememberLoginReturn } from "@/lib/storage/login-return";

const ICON = { morning: "sun", evening: "moon" } as const;
const TIMES_OF_DAY = ["morning", "evening"] as const satisfies readonly TimeOfDay[];

/** 제품 수 줄. 비어 있는 구간은 빼고 적는다. 예: '제품 3개 · 저녁 3'(RT9-a) */
const countLine = (routine: SharedRoutineResponse): string => {
  const parts = TIMES_OF_DAY.filter((key) => routine[key].length > 0).map(
    (key) => `${TIME_OF_DAY_LABEL[key]} ${routine[key].length}`,
  );
  return [`제품 ${routine.morning.length + routine.evening.length}개`, ...parts].join(" · ");
};

function Sections({ routine }: { readonly routine: SharedRoutineResponse }) {
  const filled = TIMES_OF_DAY.filter((key) => routine[key].length > 0);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(filled[0] ?? "morning");

  if (filled.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="sun-moon" size={28} />}
        title="아직 담긴 제품이 없어요"
        description="작성자가 제품을 담으면 여기에 보여요."
        className="flex-1"
      />
    );
  }

  // 한 구간만 있으면 탭 없이 그 구간만 보여 준다(RT9-a).
  if (filled.length === 1) {
    const key = filled[0];
    return (
      <section aria-labelledby="shared-routine-section" className="flex flex-col gap-2 px-gutter pt-2">
        <h2 id="shared-routine-section" className="flex items-center gap-2 text-section font-bold text-text-primary">
          <Icon name={ICON[key]} size={20} />
          {TIME_OF_DAY_LABEL[key]} 루틴 <span className="text-text-secondary">{routine[key].length}</span>
        </h2>
        <RoutineProductList products={routine[key]} />
      </section>
    );
  }

  return (
    <Tabs
      value={timeOfDay}
      onValueChange={(value) => setTimeOfDay(value === "evening" ? "evening" : "morning")}
      layout="fixed"
    >
      <div className="px-gutter">
        <TabList label="루틴 구간">
          {TIMES_OF_DAY.map((key) => (
            <Tab key={key} value={key}>
              <span className="flex items-center gap-1.5">
                <Icon name={ICON[key]} size={16} />
                <TabLabel>
                  {TIME_OF_DAY_LABEL[key]} {routine[key].length}
                </TabLabel>
              </span>
            </Tab>
          ))}
        </TabList>
      </div>
      {TIMES_OF_DAY.map((key) => (
        <TabPanel key={key} value={key} className="flex flex-col">
          <div className="px-gutter">
            <RoutineProductList products={routine[key]} />
          </div>
        </TabPanel>
      ))}
    </Tabs>
  );
}

function SharedBody({ routine }: { readonly routine: SharedRoutineResponse }) {
  const router = useRouter();
  const toast = useToast();
  const [imported, setImported] = useState<RoutineResponse>();
  const [busy, setBusy] = useState(false);
  const [loginAsked, setLoginAsked] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const startImport = async () => {
    if (imported) {
      router.push(`/routine/${imported.id}`);
      return;
    }
    setBusy(true);
    try {
      const created = await importRoutine(routine.id);
      setImported(created);
      toast.show({
        message: `‘${routine.name}’${josaOf(routine.name, "을/를")} 내 루틴에 가져왔어요`,
        action: {
          label: "보기",
          onClick: () => router.push(`/routine/${created.id}`),
          returnFocusTo: () => mainRef.current,
        },
      });
    } catch (error: unknown) {
      if (isSignedOut(error)) {
        setLoginAsked(true);
      } else {
        toast.show({ message: "루틴을 가져오지 못했어요. 잠시 뒤 다시 해 주세요." });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SubTopBar title={routine.name} />
      <ScreenBody>
        <main ref={mainRef} tabIndex={-1} className="flex flex-1 flex-col gap-4 pb-28 outline-none">
          <div className="flex items-center gap-3 px-gutter pt-4">
            <ProfileAvatar src={routine.author.profileImageUrl} className="size-10" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body font-semibold text-text-primary">{routine.author.nickname}</span>
              <span className="text-caption text-text-secondary">{countLine(routine)}</span>
            </span>
          </div>
          <Sections routine={routine} />
        </main>
      </ScreenBody>
      <BottomActionBar
        position="above-nav"
        className="bottom-(--bottom-navigation-height)"
        action={{
          label: imported ? "내 루틴에서 보기" : "내 루틴으로 가져오기",
          onClick: startImport,
          busy,
        }}
      />
      <ConfirmSheet
        open={loginAsked}
        title="가져오려면 로그인이 필요해요"
        description="로그인하면 이 루틴을 내 루틴으로 복사해 두고 순서나 제품을 내 피부에 맞게 고칠 수 있어요."
        confirmLabel="로그인하고 가져오기"
        cancelLabel="다음에 할게요"
        onConfirm={() => {
          setLoginAsked(false);
          rememberLoginReturn();
          router.push("/login");
        }}
        onCancel={() => setLoginAsked(false)}
      />
    </>
  );
}

/** 공개 루틴 상세(RT9). 메모 없이 작성자와 구간별 제품을 보여 주고, 내 루틴으로 가져올 수 있다. */
export function SharedRoutineScreen({ routineId }: { readonly routineId: number }) {
  const { state, retry } = useSharedRoutine(routineId);

  if (state.status === "ready") return <SharedBody routine={state.data} />;

  return (
    <>
      <SubTopBar title="루틴" />
      <ScreenBody>
        <main aria-busy={state.status === "loading" || undefined} className="flex flex-1 flex-col">
          {state.status === "error" ? (
            <ErrorState
              variant="screen"
              icon={<Icon name="alert-circle" size={28} />}
              title="루틴을 불러오지 못했어요"
              description="잠시 후 다시 시도해 주세요."
              action={
                <Button variant="secondary" onClick={retry}>
                  다시 시도
                </Button>
              }
              className="flex-1"
            />
          ) : null}
          {state.status === "notFound" ? (
            <EmptyState
              icon={<Icon name="alert-circle" size={28} />}
              title="루틴을 찾을 수 없어요"
              description="삭제했거나 공개를 끈 루틴이에요."
              className="flex-1"
            />
          ) : null}
        </main>
      </ScreenBody>
    </>
  );
}
