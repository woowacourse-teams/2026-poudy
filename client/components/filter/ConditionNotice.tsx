"use client";

import { Notice } from "@poudy/design-system/notice";
import { useState } from "react";

import { track } from "@/lib/analytics/track";
import type { ConditionResolution } from "@/lib/domain/ingredient-condition";
import { resolutionCounts } from "@/lib/domain/ingredient-condition";

type ShownNotice<T> = {
  readonly message: string;
  /** 정리하기 바로 전 상태. [되돌리기]가 이 상태로 돌려놓는다. */
  readonly before: T;
  /** 정리를 일으킨 칩이나 담기 버튼. 되돌린 뒤 초점을 돌려준다. */
  readonly trigger: HTMLElement | null;
};

/**
 * 성분 조건 충돌을 정리한 뒤 띄우는 안내 줄의 상태(명세 S33a · S35a). 안내 줄은 다음 편집 전까지 남으므로,
 * 쓰는 화면은 편집할 때마다 clear 를 부르고 충돌을 정리했을 때만 show 를 부른다.
 */
export function useConditionNotice<T>() {
  const [notice, setNotice] = useState<ShownNotice<T> | undefined>(undefined);

  return {
    notice,
    /** 정리한 것이 있으면 안내 줄을 띄우고 filter_conflict_shown 을 남긴다. 없으면 떠 있던 안내 줄을 닫는다. */
    show: (message: string, resolved: ConditionResolution, before: T) => {
      if (!message) {
        setNotice(undefined);
        return;
      }
      track("filter_conflict_shown", resolutionCounts(resolved));
      // 초점은 누른 칩이나 버튼에 그대로 둔다. 되돌린 뒤 돌려줄 자리로 기억해 둔다.
      const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setNotice({ message, before, trigger });
    },
    clear: () => setNotice(undefined),
  };
}

type ConditionNoticeProps<T> = {
  readonly notice: ShownNotice<T> | undefined;
  readonly onUndo: (before: T) => void;
  readonly onClose: () => void;
  readonly className?: string;
};

/** 충돌을 정리했다고 알리는 안내 줄. [되돌리기]와 ✕ 를 둔다(명세 APP · 안내 줄, S36 과 같은 모양). */
export function ConditionNotice<T>({ notice, onUndo, onClose, className }: ConditionNoticeProps<T>) {
  if (!notice) return null;

  const undo = () => {
    onUndo(notice.before);
    onClose();
    // 안내 줄이 사라지면 [되돌리기]에 있던 초점을 잃는다. 정리를 일으킨 자리로 돌려준다.
    if (notice.trigger?.isConnected) notice.trigger.focus({ preventScroll: true });
  };

  return (
    <Notice actions={[{ label: "되돌리기", onClick: undo }]} onClose={onClose} className={className}>
      {notice.message}
    </Notice>
  );
}
