"use client";

import type { SharedRoutineDetailResponse } from "@poudy/api/api.zod";
import { Button } from "@poudy/design-system/button";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoutineCommentBar, RoutineCommentSection, useRoutineComments } from "./RoutineComments";
import { RoutineMemoText } from "./RoutineMemoText";
import { RoutineProductList } from "./RoutineProductList";
import { RoutineReactionRow } from "./RoutineReactionRow";
import { SkinTypeChip } from "./SkinTypeChip";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { rememberFeatureFlow } from "@/lib/analytics/feature-flow";
import { completeFeatureIntent, requestFeatureLogin } from "@/lib/analytics/feature-login";
import { routineFlow, routineProperties } from "@/lib/analytics/routine";
import { track } from "@/lib/analytics/track";
import { isSignedOut } from "@/lib/api/member";
import { importRoutine, likeRoutine, unlikeRoutine } from "@/lib/api/routine";
import { RETRY_LATER } from "@/lib/domain/messages";
import { TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";
import { useSharedRoutine } from "@/lib/hooks/useRoutines";
import { sharePage } from "@/lib/interaction/share";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type LoginPrompt = "import" | "like";

/** 로그인 안내 문구(S202 · S203). 무엇을 하려다 막혔는지에 따라 바꿔 쓰고, 버튼은 모두 [다음에] [로그인]이다. */
const LOGIN_PROMPT = {
  import: {
    title: "가져오려면 로그인이 필요해요",
    description: "이 루틴을 내 루틴으로 복사해 두고 순서나 제품을 내 피부에 맞게 고쳐 보세요.",
  },
  like: {
    title: "좋아요를 누르려면 로그인이 필요해요",
    description: "로그인하면 마음에 드는 루틴에 좋아요를 남길 수 있어요.",
  },
} as const satisfies Record<LoginPrompt, { readonly title: string; readonly description: string }>;

const TIMES_OF_DAY = ["morning", "evening"] as const satisfies readonly TimeOfDay[];

/** 구간을 위아래로 이어 보여 준다(RT9). 빈 구간은 빼고, 둘 다 비었으면 빈 상태를 둔다. */
function Sections({ routine }: { readonly routine: SharedRoutineDetailResponse }) {
  const filled = TIMES_OF_DAY.filter((key) => routine[key].length > 0);

  if (filled.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="sun-moon" size={28} />}
        title="아직 추가된 제품이 없어요"
        description="작성자가 제품을 추가하면 여기에 보여요."
        className="flex-1"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {filled.map((key) => (
        <section key={key} aria-labelledby={`shared-routine-${key}`} className="flex flex-col gap-2 px-gutter">
          <h2 id={`shared-routine-${key}`} className="flex items-center gap-2 text-section font-bold text-text-primary">
            <TimeOfDayIcon timeOfDay={key} size={20} />
            {TIME_OF_DAY_LABEL[key]} 루틴 <span className="text-text-secondary">{routine[key].length}</span>
          </h2>
          <RoutineProductList products={routine[key]} routineId={routine.id} />
        </section>
      ))}
    </div>
  );
}

function SharedBody({
  routine,
  signedOut,
}: {
  readonly routine: SharedRoutineDetailResponse;
  readonly signedOut: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt>();
  const [liked, setLiked] = useState(routine.liked);
  const [likeCount, setLikeCount] = useState(routine.likeCount);
  const comments = useRoutineComments(routine.id);
  const flow = routineFlow(routine.id);
  useTrackedView(
    "routine_viewed",
    { ...flow, ...routineProperties({ ...routine, isPublic: true }), view_type: "public" },
    { key: String(routine.id) },
  );

  /** 가져오면 바로 새 내 루틴으로 간다. */
  const startImport = async () => {
    if (busy) return;
    track("routine_import_started", { ...flow, source_routine_id: routine.id });
    setBusy(true);
    try {
      const created = await importRoutine(routine.id);
      rememberFeatureFlow("routine", created.id, flow);
      track("routine_imported", { ...flow, ...routineProperties(created), source_routine_id: routine.id });
      completeFeatureIntent("routine_import", routine.id);
      router.push(`/routines/${created.id}`);
    } catch (error: unknown) {
      setBusy(false);
      if (isSignedOut(error)) {
        setLoginPrompt("import");
        return;
      }
      toast.show({ message: `루틴을 가져오지 못했어요. ${RETRY_LATER}` });
    }
  };

  /** 누르자마자 바꿔 그리고, 실패하면 되돌린다. */
  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    try {
      if (next) await likeRoutine(routine.id);
      else await unlikeRoutine(routine.id);
      if (next) completeFeatureIntent("routine_like", routine.id);
      track("routine_like_changed", { ...flow, routine_id: routine.id, action: next ? "like" : "unlike" });
    } catch (error: unknown) {
      setLiked(!next);
      setLikeCount((count) => count - (next ? 1 : -1));
      if (isSignedOut(error)) {
        setLoginPrompt("like");
        return;
      }
      toast.show({ message: `좋아요를 바꾸지 못했어요. ${RETRY_LATER}` });
    }
  };

  const share = async () => {
    const result = await sharePage(window.location.href);
    if (result === "copied") toast.show({ message: "주소를 복사했어요" });
  };

  const prompt = LOGIN_PROMPT[loginPrompt ?? "import"];

  return (
    <>
      <SubTopBar title={routine.name} action={{ icon: "share", label: `${routine.name} 공유`, onClick: share }} />
      <ScreenBody>
        <main className="flex flex-1 flex-col pb-inquiry">
          <div className="flex flex-col gap-4 px-gutter pt-4">
            <div className="flex items-center gap-3">
              <ProfileAvatar src={routine.author.profileImageUrl} className="size-10" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-body font-semibold text-text-primary">{routine.author.nickname}</span>
                  <SkinTypeChip skinType={routine.author.skinType} />
                </span>
                <span className="text-caption text-text-secondary">
                  제품 {routine.morning.length + routine.evening.length}개
                </span>
              </span>
            </div>
            {routine.memo ? <RoutineMemoText memo={routine.memo} /> : null}
          </div>
          <div className="flex flex-col px-gutter">
            <RoutineReactionRow
              likeCount={likeCount}
              liked={liked}
              onLike={toggleLike}
              commentCount={comments.state.status === "ready" ? comments.state.total : routine.commentCount}
            />
            {/* 화면 아래는 댓글 입력 바가 쓰므로 가져오기는 작성자·반응 줄 바로 아래에 둔다(S198). */}
            <div className="pt-2">
              <Button size="lg" className="w-full" onClick={startImport} busy={busy}>
                내 루틴으로 가져오기
              </Button>
            </div>
          </div>
          <div className="pt-6">
            <Sections routine={routine} />
          </div>
          <RoutineCommentSection thread={comments} emptyText="첫 댓글을 남겨 보세요." />
        </main>
      </ScreenBody>
      <RoutineCommentBar routineId={routine.id} thread={comments} signedOut={signedOut} />
      <ConfirmSheet
        open={loginPrompt !== undefined}
        title={prompt.title}
        description={prompt.description}
        confirmLabel="로그인"
        cancelLabel="다음에"
        onConfirm={() => {
          setLoginPrompt(undefined);
          rememberLoginReturn();
          requestFeatureLogin(loginPrompt === "like" ? "routine_like" : "routine_import", routine.id);
          router.push("/login");
        }}
        onCancel={() => setLoginPrompt(undefined)}
      />
    </>
  );
}

/**
 * 공개 루틴 상세(S198). 작성자·메모·반응 줄과 가져오기, 구간별 제품, 댓글을 한 화면에 두고 화면 아래에 댓글 입력 바를 붙인다.
 * 가져오면 바로 새 내 루틴으로 간다.
 */
export function SharedRoutineScreen({
  routineId,
  signedOut = false,
}: {
  readonly routineId: number;
  /** 로그인 전인지. 댓글 입력칸을 누르는 순간 로그인 안내를 연다(S207). */
  readonly signedOut?: boolean;
}) {
  const { state, retry } = useSharedRoutine(routineId);

  if (state.status === "ready") return <SharedBody routine={state.data} signedOut={signedOut} />;

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
              description={RETRY_LATER}
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
              description="삭제됐거나 나만 보기로 바뀐 루틴이에요."
              className="flex-1"
            />
          ) : null}
        </main>
      </ScreenBody>
    </>
  );
}
