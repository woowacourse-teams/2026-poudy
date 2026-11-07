import { Icon } from "@poudy/design-system/icon";

/** 루틴 카드 아래의 좋아요·댓글 수(RT2·RT8). */
export function RoutineReactionCounts({
  likeCount,
  commentCount,
}: {
  readonly likeCount: number;
  readonly commentCount: number;
}) {
  return (
    <span className="flex items-center gap-4 border-t border-border pt-3 text-body text-text-secondary">
      <span className="flex items-center gap-1.5">
        <Icon name="heart" size={16} />
        <span className="sr-only">좋아요</span>
        {likeCount}
      </span>
      <span className="flex items-center gap-1.5">
        <Icon name="message-circle" size={16} />
        <span className="sr-only">댓글</span>
        {commentCount}
      </span>
    </span>
  );
}
