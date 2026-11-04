"use client";

import type { SharedRoutineDetailResponse } from "@poudy/api/api.zod";
import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Button } from "@poudy/design-system/button";
import { cn } from "@poudy/design-system/cn";
import { ConfirmSheet } from "@poudy/design-system/confirm-sheet";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { ScreenBody } from "@poudy/design-system/screen";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoutineCommentPreview } from "./RoutineCommentPreview";
import { RoutineMemoText } from "./RoutineMemoText";
import { RoutineProductList } from "./RoutineProductList";
import { SkinTypeChip } from "./SkinTypeChip";
import { TimeOfDayIcon } from "./TimeOfDayIcon";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { isSignedOut } from "@/lib/api/member";
import { importRoutine, likeRoutine, unlikeRoutine } from "@/lib/api/routine";
import { TIME_OF_DAY_LABEL, type TimeOfDay } from "@/lib/domain/routine";
import { useSharedRoutine } from "@/lib/hooks/useRoutines";
import { sharePage } from "@/lib/interaction/share";
import { rememberLoginReturn } from "@/lib/storage/login-return";

type LoginPrompt = "import" | "like";

/** 로그인 안내 문구(RT10). 무엇을 하려다 막혔는지에 따라 바꿔 쓴다. */
const LOGIN_PROMPT = {
  import: {
    title: "가져오려면 로그인이 필요해요",
    description: "로그인하면 이 루틴을 내 루틴으로 복사해 두고 순서나 제품을 내 피부에 맞게 고칠 수 있어요.",
    confirm: "로그인하고 가져오기",
  },
  like: {
    title: "좋아요를 누르려면 로그인이 필요해요",
    description: "로그인하면 마음에 드는 루틴에 좋아요를 남길 수 있어요.",
    confirm: "로그인하고 좋아요",
  },
} as const satisfies Record<
  LoginPrompt,
  { readonly title: string; readonly description: string; readonly confirm: string }
>;

function LikeButton({
  liked,
  count,
  onPress,
}: {
  readonly liked: boolean;
  readonly count: number;
  readonly onPress: () => void;
}) {
  const { pressableProps } = usePressable();

  return (
    <button
      {...pressableProps}
      type="button"
      aria-pressed={liked}
      onClick={onPress}
      className={cn(
        "pressable fb-surface -ms-2 inline-flex h-11 items-center gap-1.5 self-start rounded-md px-2 text-body select-none",
        liked ? "font-semibold text-brand-text" : "text-text-primary",
      )}
    >
      <Icon name="heart" size={20} filled={liked} />
      좋아요 {count}
    </button>
  );
}

const TIMES_OF_DAY = ["morning", "evening"] as const satisfies readonly TimeOfDay[];

/** 구간을 위아래로 이어 보여 준다(RT9). 빈 구간은 빼고, 둘 다 비었으면 빈 상태를 둔다. */
function Sections({ routine }: { readonly routine: SharedRoutineDetailResponse }) {
  const filled = TIMES_OF_DAY.filter((key) => routine[key].length > 0);

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

  return (
    <div className="flex flex-col gap-6">
      {filled.map((key) => (
        <section key={key} aria-labelledby={`shared-routine-${key}`} className="flex flex-col gap-2 px-gutter">
          <h2 id={`shared-routine-${key}`} className="flex items-center gap-2 text-section font-bold text-text-primary">
            <TimeOfDayIcon timeOfDay={key} size={20} />
            {TIME_OF_DAY_LABEL[key]} 루틴 <span className="text-text-secondary">{routine[key].length}</span>
          </h2>
          <RoutineProductList products={routine[key]} />
        </section>
      ))}
    </div>
  );
}

function SharedBody({ routine }: { readonly routine: SharedRoutineDetailResponse }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt>();
  const [liked, setLiked] = useState(routine.liked);
  const [likeCount, setLikeCount] = useState(routine.likeCount);

  /** 가져오면 바로 새 내 루틴으로 간다. */
  const startImport = async () => {
    setBusy(true);
    try {
      const created = await importRoutine(routine.id);
      router.push(`/routine/${created.id}`);
    } catch (error: unknown) {
      setBusy(false);
      if (isSignedOut(error)) {
        setLoginPrompt("import");
        return;
      }
      toast.show({ message: "루틴을 가져오지 못했어요. 잠시 뒤 다시 해 주세요." });
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
    } catch (error: unknown) {
      setLiked(!next);
      setLikeCount((count) => count - (next ? 1 : -1));
      if (isSignedOut(error)) {
        setLoginPrompt("like");
        return;
      }
      toast.show({ message: "좋아요를 바꾸지 못했어요. 잠시 뒤 다시 해 주세요." });
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
        <main className="flex flex-1 flex-col gap-4 pb-6">
          <div className="flex items-center gap-3 px-gutter pt-4">
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
          {routine.memo ? (
            <div className="px-gutter">
              <RoutineMemoText memo={routine.memo} />
            </div>
          ) : null}
          <div className="-mt-2 px-gutter">
            <LikeButton liked={liked} count={likeCount} onPress={toggleLike} />
          </div>
          <Sections routine={routine} />
          <RoutineCommentPreview
            routineId={routine.id}
            commentCount={routine.commentCount}
            comments={routine.comments}
            writable
          />
        </main>
      </ScreenBody>
      <BottomActionBar
        position="above-nav"
        className="bottom-(--bottom-navigation-height)"
        action={{
          label: "내 루틴으로 가져오기",
          onClick: startImport,
          busy,
        }}
      />
      <ConfirmSheet
        open={loginPrompt !== undefined}
        title={prompt.title}
        description={prompt.description}
        confirmLabel={prompt.confirm}
        cancelLabel="다음에 할게요"
        onConfirm={() => {
          setLoginPrompt(undefined);
          rememberLoginReturn();
          router.push("/login");
        }}
        onCancel={() => setLoginPrompt(undefined)}
      />
    </>
  );
}

/** 공개 루틴 상세(RT9). 작성자·메모와 구간별 제품을 보여 주고, 가져오면 바로 새 내 루틴으로 간다. */
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
