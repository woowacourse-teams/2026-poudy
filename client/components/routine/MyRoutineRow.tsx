"use client";

import type { RoutineSummaryResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { Skeleton } from "@poudy/design-system/skeleton";
import { useDragScroll } from "@poudy/design-system/use-drag-scroll";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";

import { RoutineVisibility } from "./RoutineVisibility";

import { AdminSessionNotice } from "@/components/login/AdminSessionNotice";
import type { FeatureFlow } from "@/lib/analytics/events";
import { rememberRoutineEntry } from "@/lib/analytics/routine";
import type { RoutineListState } from "@/lib/hooks/useRoutinePages";

/** 줄에 둔 루틴이 이보다 많으면 '전체 보기'로 내 루틴 전체 화면을 연다(S173 context). */
export const MY_ROUTINE_ROW_LIMIT = 3;

/**
 * 줄의 작은 카드와 만들기 카드 크기(148 × 92). 높이는 최소값으로 두어, 기기 글자 크기를 키우면 글자를 따라 카드가 자란다.
 * 한 줄의 카드는 가장 큰 카드 높이에 맞춰 함께 늘어난다.
 */
const CARD = "flex min-h-23 w-37 shrink-0 rounded-lg p-3";

function MyRoutineMiniCard({
  routine,
  flow,
}: {
  readonly routine: RoutineSummaryResponse;
  readonly flow: FeatureFlow;
}) {
  const { pressableProps } = usePressable();

  return (
    <Link
      {...pressableProps}
      href={`/routines/${routine.id}`}
      onNavigate={() => rememberRoutineEntry(routine, flow)}
      className={cn("pressable press-scale fb-border flex-col items-start gap-2 bg-surface", CARD)}
    >
      <RoutineVisibility isPublic={routine.isPublic} onSurface />
      <span className="flex w-full min-w-0 flex-col gap-0.5">
        <span className="truncate text-body-sm leading-snug font-bold text-text-primary">{routine.name}</span>
        <span className="text-caption text-text-secondary">
          아침 {routine.morning.length} · 저녁 {routine.evening.length}
        </span>
      </span>
    </Link>
  );
}

/** 줄 끝 '새 루틴' 카드. 내 루틴이 없거나 로그인 전이면 '내 루틴 만들기' 하나만 둔다(S175). */
function CreateCard({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <button
      {...pressableProps}
      type="button"
      aria-haspopup="dialog"
      onClick={onPress}
      className={cn(
        "pressable press-scale fb-surface flex-col items-center justify-center gap-1 border border-border text-body-sm font-semibold text-text-primary",
        CARD,
      )}
    >
      <Icon name="plus" size={20} />
      {label}
    </button>
  );
}

/** 내 루틴만 불러오지 못했을 때(S177). 둘러보기는 그대로 두고 이 줄 자리에만 알린다. */
function RowError({ onRetry }: { readonly onRetry: () => void }) {
  const { pressableProps } = usePressable();

  return (
    <div
      role="alert"
      // 문구 아래에 [다시 시도]를 둔다. 오른쪽에 두면 좁은 폭이나 큰 글자에서 문구가 세 줄로 갈라진다.
      // 높이는 최소 92(카드 줄과 같은 자리)이고, 글자를 키워 문구가 여러 줄이 되면 함께 자란다.
      className="flex min-h-23 flex-col justify-center gap-1 rounded-lg bg-surface px-4 py-3 text-body text-text-primary"
    >
      <span className="flex items-center gap-2">
        <Icon name="alert-circle" size={20} className="shrink-0 text-text-secondary" />
        <span className="min-w-0 flex-1 break-keep">내 루틴을 불러오지 못했어요</span>
      </span>
      {/* 앞 20 = 아이콘 20 + 간격 8 - 버튼 좌우 8. 버튼 글자가 문구 시작선에 맞는다. */}
      <span className="flex ps-5">
        <button
          {...pressableProps}
          type="button"
          onClick={onRetry}
          // 섹션 오류의 글자 버튼(neutral)과 같다. 보이는 높이는 36 이상이고, 글자를 키우면 낱말 단위로 줄을 넘기며 자란다.
          className="pressable fb-border flex min-h-9 min-w-0 items-center rounded-sm px-2 py-2 text-left text-body-sm leading-snug font-semibold break-keep text-text-primary before:absolute before:inset-x-0 before:-inset-y-1"
        >
          다시 시도
        </button>
      </span>
    </div>
  );
}

/**
 * 루틴 탭 위쪽의 내 루틴 줄(S173~S177). 첫 쪽 응답을 가로로 늘어놓고 끝에 '새 루틴'을 둔다.
 * 루틴이 3개를 넘으면 머리에 '전체 보기'를 둔다. 줄은 스크롤바를 숨겨 마우스로 끌어서도 민다(STATE S09).
 */
export function MyRoutineRow({
  state,
  flow,
  onCreate,
  onRetry,
}: {
  readonly state: RoutineListState<RoutineSummaryResponse>;
  readonly flow: FeatureFlow;
  readonly onCreate: () => void;
  readonly onRetry: () => void;
}) {
  const dragScroll = useDragScroll();
  const { pressableProps } = usePressable();
  const items = state.status === "ready" ? state.data.items : [];
  const showAll = state.status === "ready" && state.data.total > MY_ROUTINE_ROW_LIMIT;

  let body = (
    <ul {...dragScroll} className="scrollbar-none flex scroll-px-gutter gap-2 overflow-x-auto px-gutter">
      {items.map((routine) => (
        <li key={routine.id} className="flex">
          <MyRoutineMiniCard routine={routine} flow={flow} />
        </li>
      ))}
      <li className="flex">
        <CreateCard label={items.length > 0 ? "새 루틴" : "내 루틴 만들기"} onPress={onCreate} />
      </li>
    </ul>
  );
  if (state.status === "loading") {
    body = (
      <div aria-hidden="true" className="flex gap-2 px-gutter">
        <Skeleton shape="card" className="h-23 w-37" />
        <Skeleton shape="card" className="h-23 w-37" />
      </div>
    );
  }
  if (state.status === "error") {
    body = (
      <div className="px-gutter">
        <RowError onRetry={onRetry} />
      </div>
    );
  }
  if (state.status === "adminSession") body = <AdminSessionNotice className="px-gutter" />;

  return (
    <section
      aria-labelledby="my-routines-title"
      aria-busy={state.status === "loading" || undefined}
      className="flex flex-col gap-3 pt-2"
    >
      <div className="flex min-h-5.5 items-center justify-between gap-2 px-gutter">
        <h2 id="my-routines-title" className="text-section font-bold text-text-primary">
          내 루틴
        </h2>
        {showAll ? (
          <Link
            {...pressableProps}
            href="/routines/my"
            // 글자 줄 높이(22)만 차지해 머리 높이가 '전체 보기' 유무와 상관없이 같다. 눌림 면(32)과 누르는 영역(44)은 가상 요소다.
            className="pressable fb-inline fb-inline-on-background flex items-center gap-0.5 text-body-sm font-semibold text-text-secondary after:absolute after:inset-x-0 after:-inset-y-2.5"
          >
            전체 보기
            <Icon name="chevron-right" size={16} />
          </Link>
        ) : null}
      </div>
      {body}
    </section>
  );
}
