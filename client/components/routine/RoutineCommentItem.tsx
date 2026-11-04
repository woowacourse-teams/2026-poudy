import type { RoutineCommentResponse } from "@poudy/api/api.zod";
import { Tag } from "@poudy/design-system/tag";
import type { ReactNode } from "react";

import { SkinTypeChip } from "./SkinTypeChip";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { relativeTime } from "@/lib/domain/routine";

function AuthorBadge() {
  return (
    <Tag variant="label" tone="muted">
      작성자
    </Tag>
  );
}

/**
 * 댓글 한 줄. 공개 상세의 미리보기(RT9)는 지난 시간을 닉네임 줄에 붙이고, 댓글 화면(RT12)은 내용 아래에 둔다.
 * 오른쪽 끝에 더보기 같은 행동을 둘 수 있다.
 */
export function RoutineCommentItem({
  comment,
  now,
  variant = "full",
  trailing,
}: {
  readonly comment: RoutineCommentResponse;
  readonly now: Date;
  readonly variant?: "preview" | "full";
  readonly trailing?: ReactNode;
}) {
  const time = relativeTime(comment.createdAt, now);

  return (
    <div className="flex gap-3 py-2">
      <ProfileAvatar src={comment.author.profileImageUrl} className="size-8" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
          <span className="text-body-sm font-semibold text-text-primary">{comment.author.nickname}</span>
          <SkinTypeChip skinType={comment.author.skinType} />
          {variant === "preview" ? <span>· {time}</span> : null}
          {comment.byRoutineAuthor ? <AuthorBadge /> : null}
        </p>
        <p className="text-body leading-normal break-words whitespace-pre-line text-text-body">{comment.content}</p>
        {variant === "full" ? <p className="text-caption text-text-secondary">{time}</p> : null}
      </div>
      {trailing}
    </div>
  );
}
