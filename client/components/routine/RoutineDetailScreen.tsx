"use client";

import type { RoutineProductResponse, RoutineResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RoutineMemoText } from "./RoutineMemoText";
import { RoutineMenuSheet } from "./RoutineMenuSheet";
import { RoutineProductMenuSheet } from "./RoutineProductMenuSheet";
import { RoutineSortableList } from "./RoutineSortableList";
import { type RoutineTextField, RoutineTextSheet } from "./RoutineTextSheet";
import { RoutineVisibility } from "./RoutineVisibility";
import { SharedRoutineScreen } from "./SharedRoutineScreen";
import { TimeOfDayIcon } from "./TimeOfDayIcon";
import { usePinnedTabs } from "./usePinnedTabs";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { deleteRoutine, fetchRoutineComments, replaceRoutineProducts, updateRoutine } from "@/lib/api/routine";
import { josaOf, withJosa } from "@/lib/domain/format";
import { RETRY_LATER } from "@/lib/domain/messages";
import {
  isInOtherTimeOfDay,
  movedProduct,
  otherTimeOfDay,
  removedProduct,
  reorderedProducts,
  type RoutineProductIds,
  type TimeOfDay,
} from "@/lib/domain/routine";
import { useMyRoutine } from "@/lib/hooks/useRoutines";

/** 아침·저녁 탭 줄이 붙는 높이. 하위 상단 내비(44) 바로 아래다. */
const TABS_STUCK_AT = 44;

const TIME_OF_DAY = {
  morning: { label: "아침" },
  evening: { label: "저녁" },
} as const;

/** 처음 여는 구간. 아침이 비고 저녁에만 제품이 있으면 저녁부터 보여 준다. */
const firstTimeOfDay = (routine: RoutineResponse): TimeOfDay => {
  if (routine.morning.length === 0 && routine.evening.length > 0) return "evening";
  return "morning";
};

/** 구간 끝의 제품 추가 줄(RT4). 동그란 회색 면의 + 옆에 문구를 둔다. */
function AddProductRow({ label, href }: { readonly label: string; readonly href: string }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      {...pressableProps}
      href={href}
      className="pressable fb-surface flex min-h-11 items-center gap-3 self-start rounded-md pe-2 text-body font-semibold text-text-primary"
    >
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-surface">
        <Icon name="plus" size={20} />
      </span>
      {label}
    </Link>
  );
}

/**
 * 내 루틴의 댓글로 가는 줄. 공개하는 동안 받은 댓글은 비공개로 바꿔도 작성자는 볼 수 있다.
 * 비공개 루틴에 댓글이 없으면 볼 것도 남길 것도 없어 그리지 않는다.
 */
function CommentsLink({ routineId, isPublic }: { readonly routineId: number; readonly isPublic: boolean }) {
  const { pressableProps } = usePressable();
  const [count, setCount] = useState<number>();

  useEffect(() => {
    fetchRoutineComments(routineId, 1).then(
      (page) => setCount(page.pagination.totalElements),
      () => setCount(undefined),
    );
  }, [routineId, isPublic]);

  if (count === undefined || (count === 0 && !isPublic)) return null;

  return (
    <Link
      {...pressableProps}
      href={`/routines/${routineId}/comments`}
      className="pressable fb-surface -ms-2 flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 text-body text-text-primary"
    >
      <Icon name="message-circle" size={20} />
      댓글 {count}
      <Icon name="chevron-right" size={16} className="text-text-secondary" />
    </Link>
  );
}

function RoutineBody({
  routine,
  initialTimeOfDay,
  onChange,
}: {
  readonly routine: RoutineResponse;
  readonly initialTimeOfDay: TimeOfDay | undefined;
  readonly onChange: (routine: RoutineResponse) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => initialTimeOfDay ?? firstTimeOfDay(routine));

  /** 고른 탭을 주소에 남겨, 제품 추가처럼 다른 화면에 갔다 돌아와도 같은 탭으로 연다. */
  const { tabsRef, panelRef, willSelect } = usePinnedTabs(timeOfDay, TABS_STUCK_AT);

  const selectTimeOfDay = (next: TimeOfDay) => {
    willSelect();
    setTimeOfDay(next);
    router.replace(`/routines/${routine.id}?time=${next}`, { scroll: false });
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineTextField>();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuProduct, setMenuProduct] = useState<RoutineProductResponse>();

  const saveProducts = async (products: RoutineProductIds) =>
    onChange(
      await replaceRoutineProducts(routine.id, {
        morningProductIds: [...products.morningProductIds],
        eveningProductIds: [...products.eveningProductIds],
      }),
    );

  const reorder = async (move: { readonly from: number; readonly to: number }) => {
    try {
      await saveProducts(reorderedProducts(routine, timeOfDay, move));
    } catch (error: unknown) {
      toast.show({ message: `순서를 바꾸지 못했어요. ${RETRY_LATER}` });
      throw error;
    }
  };

  const editProduct = async (products: RoutineProductIds, done: string, failed: string) => {
    setMenuProduct(undefined);
    try {
      await saveProducts(products);
      toast.show({ message: done });
    } catch {
      toast.show({ message: `${failed} ${RETRY_LATER}` });
    }
  };

  const addHref = `/routines/${routine.id}/add?time=${timeOfDay}`;

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
      toast.show({ message: `공개 여부를 바꾸지 못했어요. ${RETRY_LATER}` });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteRoutine(routine.id);
      toast.show({ message: `${withJosa(routine.name, "을/를")} 삭제했어요` });
      router.replace("/routines");
    } catch {
      setBusy(false);
      toast.show({ message: `루틴을 삭제하지 못했어요. ${RETRY_LATER}` });
    }
  };

  const count = routine.morning.length + routine.evening.length;

  return (
    <>
      <SubTopBar
        title={routine.name}
        edge={false}
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
              제품 {count}개
            </p>
            {routine.memo ? <RoutineMemoText key={routine.memo} memo={routine.memo} /> : null}
            <CommentsLink routineId={routine.id} isPublic={routine.isPublic} />
          </div>
          <Tabs
            value={timeOfDay}
            onValueChange={(value) => selectTimeOfDay(value === "evening" ? "evening" : "morning")}
            layout="fixed"
            slide
          >
            <div ref={tabsRef} className="sticky top-11 z-(--z-sticky) bg-background px-gutter">
              <TabList label="루틴 구간">
                {(["morning", "evening"] as const).map((key) => (
                  <Tab key={key} value={key}>
                    <span className="flex items-center gap-1.5">
                      <TimeOfDayIcon timeOfDay={key} size={16} />
                      <TabLabel>
                        {TIME_OF_DAY[key].label} {routine[key].length}
                      </TabLabel>
                    </span>
                  </Tab>
                ))}
              </TabList>
            </div>
            <div ref={panelRef} className="routine-time-tab-runway flex flex-1 scroll-mt-22 flex-col">
              {(["morning", "evening"] as const).map((key) => (
                <TabPanel key={key} value={key} className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col px-gutter">
                    {routine[key].length > 0 ? (
                      <div className="pb-inquiry">
                        <RoutineSortableList
                          products={routine[key]}
                          onReorder={reorder}
                          onOpenMenu={setMenuProduct}
                          footer={<AddProductRow label={`${TIME_OF_DAY[key].label}에 제품 추가`} href={addHref} />}
                        />
                      </div>
                    ) : (
                      <EmptyState
                        icon={<TimeOfDayIcon timeOfDay={key} size={28} />}
                        title={`아직 ${TIME_OF_DAY[key].label}에 쓰는 제품이 없어요`}
                        description="바르는 순서대로 추가해 보세요."
                        action={
                          <Button variant="secondary" onClick={() => router.push(addHref)}>
                            {TIME_OF_DAY[key].label}에 제품 추가
                          </Button>
                        }
                        className="flex-1"
                      />
                    )}
                  </div>
                </TabPanel>
              ))}
            </div>
          </Tabs>
        </main>
      </ScreenBody>

      <RoutineProductMenuSheet
        product={menuProduct}
        moveTo={
          menuProduct && !isInOtherTimeOfDay(routine, timeOfDay, menuProduct.id) ? otherTimeOfDay(timeOfDay) : undefined
        }
        onClose={() => setMenuProduct(undefined)}
        onMove={(product) =>
          editProduct(
            movedProduct(routine, timeOfDay, product.id),
            `${withJosa(product.name, "을/를")} ${TIME_OF_DAY[otherTimeOfDay(timeOfDay)].label}으로 옮겼어요`,
            "옮기지 못했어요.",
          )
        }
        onRemove={(product) =>
          editProduct(
            removedProduct(routine, timeOfDay, product.id),
            `${withJosa(product.name, "을/를")} 루틴에서 뺐어요`,
            "루틴에서 빼지 못했어요.",
          )
        }
      />
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
        title={`‘${routine.name}’${josaOf(routine.name, "을/를")} 삭제할까요?`}
        description={`추가한 아침 ${routine.morning.length}개 · 저녁 ${routine.evening.length}개 순서와 메모가 함께 지워져요. 파우치에 있는 제품은 그대로예요.`}
        confirmLabel="삭제"
        tone="destructive"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}

/** 내 루틴 상세(/routines/[routineId], RT4). 아침·저녁 탭과 더보기 시트를 둔다. */
export function RoutineDetailScreen({
  routineId,
  initialTimeOfDay,
}: {
  readonly routineId: number;
  readonly initialTimeOfDay?: TimeOfDay;
}) {
  // 내 루틴이 아니면 공개 루틴으로 넘기는 정상 흐름이라, 그 401·404 는 오류로 남기지 않는다.
  const { state, retry, replace } = useMyRoutine(routineId, { reportErrors: false });

  // 내 루틴이 아니거나 로그인하지 않았으면 같은 주소의 공개 루틴으로 연다(RT9).
  if (state.status === "notFound" || state.status === "signedOut") {
    return (
      <Screen scroll="document" className="min-h-0 flex-1">
        <SharedRoutineScreen routineId={routineId} />
      </Screen>
    );
  }

  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      {state.status === "ready" ? (
        <RoutineBody routine={state.data} initialTimeOfDay={initialTimeOfDay} onChange={replace} />
      ) : (
        <>
          <SubTopBar title="루틴" />
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
            </main>
          </ScreenBody>
        </>
      )}
    </Screen>
  );
}
