"use client";

import type { RoutineProductResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoutineCommentBar, RoutineCommentSection, useRoutineComments } from "./RoutineComments";
import { RoutineMemoText } from "./RoutineMemoText";
import { RoutineMenuSheet } from "./RoutineMenuSheet";
import { RoutineProductMenuSheet } from "./RoutineProductMenuSheet";
import { RoutineReactionRow } from "./RoutineReactionRow";
import { RoutineSortableList, type VisibleArea } from "./RoutineSortableList";
import { type RoutineTextField, RoutineTextSheet } from "./RoutineTextSheet";
import { RoutineVisibility } from "./RoutineVisibility";
import { SharedRoutineScreen } from "./SharedRoutineScreen";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { routineFlow, routineProperties, trackRoutineProducts } from "@/lib/analytics/routine";
import { track } from "@/lib/analytics/track";
import { deleteRoutine, type MyRoutineResponse, replaceRoutineProducts, updateRoutine } from "@/lib/api/routine";
import { josaOf, withJosa } from "@/lib/domain/format";
import { RETRY_LATER } from "@/lib/domain/messages";
import {
  isInOtherTimeOfDay,
  movedProduct,
  otherTimeOfDay,
  removedProduct,
  reorderedProducts,
  type RoutineProductIds,
  TIME_OF_DAY_LABEL,
  type TimeOfDay,
} from "@/lib/domain/routine";
import { useMyRoutine } from "@/lib/hooks/useRoutines";

/**
 * 루틴 제품을 끄는 동안 행이 머물 화면 범위. 붙은 상단 내비 아래부터 창 아래 끝까지다. 루틴 상세는 하단 내비를
 * 그리지 않는다(bottom-navigation-path). 상단 내비 높이는 기기 글자 크기를 따라 바뀌어 끄는 동안 잰다.
 */
const sortableArea = (): VisibleArea => ({
  top: Math.max(document.querySelector("header")?.getBoundingClientRect().bottom ?? 0, 0),
  bottom: window.innerHeight,
});

const TIMES_OF_DAY = ["morning", "evening"] as const satisfies readonly TimeOfDay[];

/** 메뉴를 연 제품과 그 제품이 속한 구간. 옮기기·빼기가 이 구간을 기준으로 한다. */
type MenuTarget = { readonly product: RoutineProductResponse; readonly timeOfDay: TimeOfDay };

/**
 * 구간 끝의 제품 추가 줄(S184). 제품 행과 같은 자리에 손잡이 칸(28)을 비우고 사진 칸(64)에 + 를 둔다.
 * 마지막 제품 행의 구분선에 바로 붙고, 화면 폭 전체가 누르는 면이다. hover 면은 ui-surface, + 칸은 한 단계 진하다.
 */
function AddProductRow({ label, href }: { readonly label: string; readonly href: string }) {
  const { pressableProps } = usePressable();

  return (
    <Link
      {...pressableProps}
      href={href}
      className="group pressable fb-bleed flex items-center gap-3 py-3 text-body font-semibold text-text-primary"
    >
      <span aria-hidden="true" className="w-7 shrink-0" />
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-md bg-surface group-data-hovered:bg-hover-on-surface group-data-pressed:bg-hover-on-surface"
      >
        <Icon name="plus" size={20} />
      </span>
      {label}
    </Link>
  );
}

function RoutineBody({
  routine,
  onChange,
}: {
  readonly routine: MyRoutineResponse;
  readonly onChange: (routine: MyRoutineResponse) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const comments = useRoutineComments(routine.id, routine.isPublic);
  const commentCount = comments.state.status === "ready" ? comments.state.total : undefined;
  // 비공개 루틴에 댓글이 없으면 볼 것도 남길 것도 없어 반응 줄과 댓글 자리를 두지 않는다(S204).
  const hasComments = routine.isPublic || (commentCount ?? 0) > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineTextField>();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuTarget, setMenuTarget] = useState<MenuTarget>();

  useTrackedView(
    "routine_viewed",
    { ...routineFlow(routine.id), ...routineProperties(routine), view_type: "own" },
    { key: String(routine.id) },
  );
  const saveProducts = async (products: RoutineProductIds) => {
    const next = await replaceRoutineProducts(routine.id, {
      morningProductIds: [...products.morningProductIds],
      eveningProductIds: [...products.eveningProductIds],
    });
    trackRoutineProducts(routine, next);
    onChange(next);
  };

  const reorder = async (timeOfDay: TimeOfDay, move: { readonly from: number; readonly to: number }) => {
    try {
      await saveProducts(reorderedProducts(routine, timeOfDay, move));
    } catch (error: unknown) {
      toast.show({ message: `순서를 바꾸지 못했어요. ${RETRY_LATER}` });
      throw error;
    }
  };

  const editProduct = async (products: RoutineProductIds, done: string, failed: string) => {
    setMenuTarget(undefined);
    try {
      await saveProducts(products);
      toast.show({ message: done });
    } catch {
      toast.show({ message: `${failed} ${RETRY_LATER}` });
    }
  };

  const save = async (change: Partial<Pick<MyRoutineResponse, "name" | "memo" | "isPublic">>) => {
    const next = { name: routine.name, memo: routine.memo, isPublic: routine.isPublic, ...change };
    const updated = await updateRoutine(routine.id, { ...next, memo: next.memo || null });
    if (updated.isPublic !== routine.isPublic)
      track("routine_visibility_changed", {
        ...routineFlow(routine.id),
        ...routineProperties(updated),
        previous_is_public: routine.isPublic,
      });
    onChange(updated);
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
          <div className="flex flex-col px-gutter pt-4 pb-2">
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-body text-text-secondary">
                <RoutineVisibility isPublic={routine.isPublic} />
                제품 {count}개
              </p>
              {routine.memo ? <RoutineMemoText key={routine.memo} memo={routine.memo} /> : null}
            </div>
            {/* 반응 줄은 메모 바로 아래 8 에 붙는다(S185). */}
            {hasComments ? <RoutineReactionRow likeCount={routine.likeCount} commentCount={commentCount} /> : null}
          </div>
          {TIMES_OF_DAY.map((key) => (
            <section
              key={key}
              aria-labelledby={`routine-${key}`}
              className={cn("flex flex-col gap-2 px-gutter", key === "evening" ? "pt-6" : "pt-2")}
            >
              <h2 id={`routine-${key}`} className="flex items-center gap-2 text-section font-bold text-text-primary">
                <TimeOfDayIcon timeOfDay={key} size={20} />
                {TIME_OF_DAY_LABEL[key]} 루틴 <span className="text-text-secondary">{routine[key].length}</span>
              </h2>
              <RoutineSortableList
                products={routine[key]}
                onReorder={(move) => reorder(key, move)}
                onOpenMenu={(product) => setMenuTarget({ product, timeOfDay: key })}
                visibleArea={sortableArea}
                footer={
                  <AddProductRow
                    label={`${TIME_OF_DAY_LABEL[key]}에 제품 추가`}
                    href={`/routines/${routine.id}/add?time=${key}`}
                  />
                }
              />
            </section>
          ))}
          {hasComments ? <RoutineCommentSection thread={comments} /> : null}
          <div aria-hidden="true" className="pb-inquiry" />
        </main>
      </ScreenBody>
      {hasComments ? <RoutineCommentBar routineId={routine.id} thread={comments} signedOut={false} /> : null}

      <RoutineProductMenuSheet
        routineId={routine.id}
        product={menuTarget?.product}
        moveTo={
          menuTarget && !isInOtherTimeOfDay(routine, menuTarget.timeOfDay, menuTarget.product.id)
            ? otherTimeOfDay(menuTarget.timeOfDay)
            : undefined
        }
        onClose={() => setMenuTarget(undefined)}
        onMove={(product) => {
          if (!menuTarget) return;
          const from = menuTarget.timeOfDay;
          editProduct(
            movedProduct(routine, from, product.id),
            `${withJosa(product.name, "을/를")} ${TIME_OF_DAY_LABEL[otherTimeOfDay(from)]}으로 옮겼어요`,
            "옮기지 못했어요.",
          );
        }}
        onRemove={(product) => {
          if (!menuTarget) return;
          editProduct(
            removedProduct(routine, menuTarget.timeOfDay, product.id),
            `${withJosa(product.name, "을/를")} 루틴에서 뺐어요`,
            "루틴에서 빼지 못했어요.",
          );
        }}
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

/** 내 루틴 상세(/routines/[routineId], S184). 아침과 저녁 구간을 탭 없이 이어 보이고, 더보기 시트를 둔다. */
export function RoutineDetailScreen({ routineId }: { readonly routineId: number }) {
  // 내 루틴이 아니면 공개 루틴으로 넘기는 정상 흐름이라, 그 401·404 는 오류로 남기지 않는다.
  const { state, retry, replace } = useMyRoutine(routineId, { reportErrors: false });

  // 내 루틴이 아니거나 로그인하지 않았으면 같은 주소의 공개 루틴으로 연다(RT9).
  if (state.status === "notFound" || state.status === "signedOut") {
    return (
      <Screen scroll="document" className="min-h-0 flex-1">
        <SharedRoutineScreen routineId={routineId} signedOut={state.status === "signedOut"} />
      </Screen>
    );
  }

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
