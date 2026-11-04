"use client";

import { Button } from "./button";
import { cn } from "./cn";
import { LiveMessage } from "./live-message";
import { useSlowFlag } from "./use-delayed-flag";

const SLOW_MESSAGE = "시간이 조금 걸리고 있어요";

export type SkeletonSlowNoticeProps = {
  /** 스켈레톤으로 기다리는 중인지. 10초 동안 끊이지 않고 켜져 있으면 안내를 보인다. */
  readonly active: boolean;
  /** [다시 시도]. 그 화면의 데이터를 다시 요청한다. */
  readonly onRetry: () => void;
  readonly className?: string;
};

/**
 * 스켈레톤이 10초를 넘기면 그 위에 '시간이 조금 걸리고 있어요' 한 줄과 [다시 시도]를 함께 보인다(FEEDBACK F02).
 * 그 전에는 아무것도 그리지 않는다. 스켈레톤을 그리는 영역 맨 위에 둔다.
 *
 * - 다시 시도한 뒤에도 기다림이 이어지면 안내와 버튼을 그대로 둔다. 누른 버튼이 사라지며 포커스를 잃지 않게 하고,
 *   목록 끝 불러오기(LoadMore)와 같게 맞춘다.
 * - 안내는 그려지는 순간 한 번 알린다(A11Y D06). 화면의 글은 낭독에서 빼 두 번 읽지 않게 한다.
 */
export function SkeletonSlowNotice({ active, onRetry, className }: SkeletonSlowNoticeProps) {
  const slow = useSlowFlag(active);
  if (!slow) return null;

  return (
    <div className={cn("flex flex-col items-center gap-2 px-gutter py-4", className)}>
      <p aria-hidden="true" className="text-center text-body-sm leading-snug text-text-secondary">
        {SLOW_MESSAGE}
      </p>
      <LiveMessage>{SLOW_MESSAGE}</LiveMessage>
      <Button variant="secondary" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
