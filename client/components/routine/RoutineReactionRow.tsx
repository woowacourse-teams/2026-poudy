"use client";

import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";

import { scrollToComments } from "./RoutineComments";

/** 반응 줄의 한 칸(높이 44 · 아이콘 20 · 간격 4 · 14). 누르는 칸은 BTN · Ghost 크기의 면을 둘레에 그린다. */
const ITEM = "inline-flex h-11 items-center gap-1 text-body select-none";
const PRESSABLE = "pressable fb-inline fb-inline-on-background";

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
      className={cn(ITEM, PRESSABLE, liked ? "text-brand-text" : "text-text-primary")}
    >
      <Icon name="heart" size={20} filled={liked} />
      좋아요 {count}
    </button>
  );
}

function CommentsButton({ count }: { readonly count: number | undefined }) {
  const { pressableProps } = usePressable();

  return (
    <button
      {...pressableProps}
      type="button"
      onClick={() => scrollToComments()}
      className={cn(ITEM, PRESSABLE, "text-text-primary")}
    >
      <Icon name="message-circle" size={20} />
      댓글{count === undefined ? "" : ` ${count}`}
    </button>
  );
}

/**
 * 루틴 상세의 반응 줄(S185 · S198). 좋아요 N 과 댓글 N 을 둔다. '댓글 N'을 누르면 상세 안의 댓글 자리로 내려간다.
 * - 내 루틴: 좋아요는 누를 수 없고 수만 보인다. 서버가 수를 주지 않으면(likeCount 없음) 좋아요 칸을 숨긴다.
 * - 남의 루틴: 좋아요를 누르고 취소한다. 누른 상태는 아이콘과 글자가 ui-brand-text 이고 굵기는 그대로다(S201).
 */
export function RoutineReactionRow({
  likeCount,
  liked,
  onLike,
  commentCount,
}: {
  readonly likeCount: number | undefined;
  readonly liked?: boolean;
  /** 있으면 좋아요를 누를 수 있다. */
  readonly onLike?: () => void;
  /** 댓글을 아직 받지 못했으면 수 없이 '댓글'만 둔다. */
  readonly commentCount: number | undefined;
}) {
  return (
    <div className="flex items-center gap-4 pt-2">
      {onLike && likeCount !== undefined ? (
        <LikeButton liked={liked ?? false} count={likeCount} onPress={onLike} />
      ) : null}
      {!onLike && likeCount !== undefined ? (
        <span className={cn(ITEM, "text-text-primary")}>
          <Icon name="heart" size={20} />
          좋아요 {likeCount}
        </span>
      ) : null}
      <CommentsButton count={commentCount} />
    </div>
  );
}
