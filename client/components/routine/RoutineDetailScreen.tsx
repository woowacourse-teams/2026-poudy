"use client";

import type { RoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoutineMemoText } from "./RoutineMemoText";
import { RoutineMenuSheet } from "./RoutineMenuSheet";
import { RoutineProductList } from "./RoutineProductList";
import { type RoutineTextField, RoutineTextSheet } from "./RoutineTextSheet";
import { RoutineVisibility } from "./RoutineVisibility";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { deleteRoutine, updateRoutine } from "@/lib/api/routine";
import { withJosa } from "@/lib/domain/format";
import { useMyRoutine } from "@/lib/hooks/useRoutines";

type TimeOfDay = "morning" | "evening";

const TIME_OF_DAY = {
  morning: { label: "아침", icon: "sun" },
  evening: { label: "저녁", icon: "moon" },
} as const;

/** 처음 여는 구간. 아침이 비고 저녁에만 제품이 있으면 저녁부터 보여 준다. */
const firstTimeOfDay = (routine: RoutineResponse): TimeOfDay => {
  if (routine.morning.length === 0 && routine.evening.length > 0) return "evening";
  return "morning";
};

function RoutineBody({
  routine,
  onChange,
}: {
  readonly routine: RoutineResponse;
  readonly onChange: (routine: RoutineResponse) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => firstTimeOfDay(routine));
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineTextField>();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (change: Partial<Pick<RoutineResponse, "name" | "memo" | "isPublic">>) => {
    const next = { name: routine.name, memo: routine.memo, isPublic: routine.isPublic, ...change };
    onChange(await updateRoutine(routine.id, { ...next, memo: next.memo || null }));
  };

  const changePublic = async (isPublic: boolean) => {
    setBusy(true);
    try {
      await save({ isPublic });
      toast.show({ message: isPublic ? "루틴을 공개했어요" : "루틴을 나만 보게 바꿨어요" });
    } catch {
      toast.show({ message: "공개 여부를 바꾸지 못했어요. 잠시 뒤 다시 해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteRoutine(routine.id);
      toast.show({ message: `${withJosa(routine.name, "을/를")} 삭제했어요` });
      router.replace("/routine");
    } catch {
      setBusy(false);
      toast.show({ message: "루틴을 삭제하지 못했어요. 잠시 뒤 다시 해 주세요." });
    }
  };

  const count = routine.morning.length + routine.evening.length;

  return (
    <>
      <SubTopBar
        title={routine.name}
        action={{
          icon: "dots",
          label: "루틴 더보기",
          onClick: () => setMenuOpen(true),
          haspopup: "dialog",
          expanded: menuOpen,
        }}
      />
      <ScreenBody>
        <main className="flex flex-1 flex-col">
          <div className="flex flex-col gap-3 px-gutter pt-4 pb-2">
            <p className="flex items-center gap-2 text-body text-text-secondary">
              <RoutineVisibility isPublic={routine.isPublic} />
              제품 {count}개 · 아침 {routine.morning.length} · 저녁 {routine.evening.length}
            </p>
            {routine.memo ? <RoutineMemoText key={routine.memo} memo={routine.memo} /> : null}
          </div>
          <Tabs
            value={timeOfDay}
            onValueChange={(value) => setTimeOfDay(value === "evening" ? "evening" : "morning")}
            layout="fixed"
          >
            <div className="px-gutter">
              <TabList label="루틴 구간">
                {(["morning", "evening"] as const).map((key) => (
                  <Tab key={key} value={key}>
                    <span className="flex items-center gap-1.5">
                      <Icon name={TIME_OF_DAY[key].icon} size={16} />
                      <TabLabel>
                        {TIME_OF_DAY[key].label} {routine[key].length}
                      </TabLabel>
                    </span>
                  </Tab>
                ))}
              </TabList>
            </div>
            {(["morning", "evening"] as const).map((key) => (
              <TabPanel key={key} value={key} className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col px-gutter">
                  {routine[key].length > 0 ? (
                    <RoutineProductList products={routine[key]} />
                  ) : (
                    <EmptyState
                      icon={<Icon name={TIME_OF_DAY[key].icon} size={28} />}
                      title={`아직 ${TIME_OF_DAY[key].label}에 쓰는 제품이 없어요`}
                      description="바르는 순서대로 담아 보세요."
                      className="flex-1"
                    />
                  )}
                </div>
              </TabPanel>
            ))}
          </Tabs>
        </main>
      </ScreenBody>

      <RoutineMenuSheet
        open={menuOpen}
        routine={routine}
        publicBusy={busy}
        onClose={() => setMenuOpen(false)}
        onEdit={(field) => {
          setMenuOpen(false);
          setEditing(field);
        }}
        onPublicChange={changePublic}
        onDelete={() => {
          setMenuOpen(false);
          setDeleting(true);
        }}
      />
      <RoutineTextSheet
        field={editing}
        initial={editing === "memo" ? (routine.memo ?? "") : routine.name}
        onClose={() => setEditing(undefined)}
        onSave={async (value) => {
          await save(editing === "memo" ? { memo: value } : { name: value });
          setEditing(undefined);
        }}
      />
      <ConfirmSheet
        open={deleting}
        title={`${withJosa(routine.name, "을/를")} 삭제할까요?`}
        description="담은 제품과 메모도 함께 지워지고 되돌릴 수 없어요."
        confirmLabel="삭제"
        tone="destructive"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}

/** 내 루틴 상세(/routine/[routineId], RT4). 아침·저녁 탭과 더보기 시트를 둔다. */
export function RoutineDetailScreen({ routineId }: { readonly routineId: number }) {
  const { state, retry, replace } = useMyRoutine(routineId);

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      {state.status === "ready" ? (
        <RoutineBody routine={state.data} onChange={replace} />
      ) : (
        <>
          <SubTopBar title="루틴" />
          <ScreenBody>
            <main aria-busy={state.status === "loading" || undefined} className="flex flex-1 flex-col">
              {state.status === "adminSession" ? <AdminSessionNotice className="px-gutter pt-4" /> : null}
              {state.status === "notFound" || state.status === "signedOut" ? (
                <EmptyState
                  icon={<Icon name="alert-circle" size={28} />}
                  title="루틴을 찾을 수 없어요"
                  description="삭제했거나 볼 수 없는 루틴이에요."
                  className="flex-1"
                />
              ) : null}
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
            </main>
          </ScreenBody>
        </>
      )}
    </Screen>
  );
}
