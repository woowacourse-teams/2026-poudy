import type { RoutineCommentResponse } from "@poudy/api/api.zod";
import { Tag } from "@poudy/design-system/tag";
import type { ReactNode } from "react";

import { SkinTypeChip } from "./SkinTypeChip";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { relativeTime } from "@/lib/domain/routine";

function AuthorBadge() {
  return (
    <Tag variant="label" tone="brand">
      작성자
    </Tag>
  );
}

/**
 * 댓글 한 줄(S185 · S206). 프로필 32 · 닉네임 줄(피부 타입 · 작성자 표지) · 내용 · 지난 시간 순이다.
 * 오른쪽 끝에 더보기 같은 행동을 둘 수 있다.
 */
export function RoutineCommentItem({
  comment,
  now,
  trailing,
}: {
  readonly comment: RoutineCommentResponse;
  readonly now: Date;
  readonly trailing?: ReactNode;
}) {
  const time = relativeTime(comment.createdAt, now);

  return (
    <div className="flex gap-3 py-2">
      <ProfileAvatar src={comment.author.profileImageUrl} className="size-8" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-h-6 flex-wrap items-center gap-1 text-caption text-text-secondary">
          <span className="text-body-sm font-semibold text-text-primary">{comment.author.nickname}</span>
          <SkinTypeChip skinType={comment.author.skinType} />
          {comment.byRoutineAuthor ? <AuthorBadge /> : null}
        </p>
        <p className="text-body leading-normal break-words whitespace-pre-line text-text-body">{comment.content}</p>
        <p className="text-caption text-text-secondary">{time}</p>
      </div>
      {trailing}
    </div>
  );
}
