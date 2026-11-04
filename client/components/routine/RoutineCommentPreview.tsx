"use client";

import type { RoutineCommentResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useState } from "react";

import { RoutineCommentItem } from "./RoutineCommentItem";

/**
 * 루틴 상세의 댓글 미리보기(RT9). 앞의 댓글 몇 개와 댓글 화면으로 가는 링크를 둔다.
 * 댓글을 남길 수 없는 비공개 루틴은 댓글이 없으면 링크 대신 그 까닭을 적는다.
 */
export function RoutineCommentPreview({
  routineId,
  commentCount,
  comments,
  writable,
}: {
  readonly routineId: number;
  readonly commentCount: number;
  readonly comments: readonly RoutineCommentResponse[];
  readonly writable: boolean;
}) {
  const [now] = useState(() => new Date());
  const { pressableProps } = usePressable();

  let empty = "첫 댓글을 남겨 보세요.";
  if (!writable) empty = "비공개 루틴이라 댓글을 남길 수 없어요.";

  return (
    <section aria-labelledby="routine-comments-title" className="flex flex-col gap-1 px-gutter pt-4">
      <h2 id="routine-comments-title" className="text-section font-bold text-text-primary">
        댓글 {commentCount}
      </h2>
      {comments.length === 0 ? (
        <p className="py-2 text-body text-text-secondary">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {comments.map((comment) => (
            <li key={comment.id}>
              <RoutineCommentItem comment={comment} now={now} variant="preview" />
            </li>
          ))}
        </ul>
      )}
      {commentCount > 0 || writable ? (
        <Link
          {...pressableProps}
          href={`/routine/${routineId}/comments`}
          className="pressable fb-border mt-1 flex h-11 items-center justify-center gap-1 rounded-lg bg-surface text-body font-semibold text-text-primary"
        >
          {commentCount > 0 ? `댓글 ${commentCount}개 모두 보기` : "댓글 쓰러 가기"}
          <Icon name="chevron-right" size={16} />
        </Link>
      ) : null}
    </section>
  );
}
