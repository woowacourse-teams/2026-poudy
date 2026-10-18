"use client";

import type { IngredientGroupResponse } from "@poudy/api/api.zod";
import { Notice } from "@poudy/design-system/notice";

import type { LinkCleanup } from "@/lib/domain/conflict";
import { josaOf } from "@/lib/domain/format";

type LinkCleanupNoticeProps = {
  readonly removed: readonly LinkCleanup[];
  readonly names: ReadonlyMap<number, string>;
  readonly excludeCodes: readonly IngredientGroupResponse[];
  /** [대신 ○○ 남기기]. 정리를 반대로 한다. */
  readonly onKeepInstead: () => void;
  /** [조건 보기]. 성분 시트를 연다. */
  readonly onShowConditions: () => void;
  readonly onClose: () => void;
};

/** 안내 문구(CONTENT W01·W07). 한 건이면 무엇과 부딪혀 뺐는지 이름으로 짚고, 여럿이면 개수로 알린다. */
const messageOf = (
  removed: readonly LinkCleanup[],
  names: ReadonlyMap<number, string>,
  excludeCodes: readonly IngredientGroupResponse[],
): { readonly text: string; readonly keepLabel: string } => {
  if (removed.length > 1) {
    return {
      text: `링크 조건 중 원하는 성분 ${removed.length}개는 피하고 싶은 성분과 함께 쓸 수 없어서 뺐어요.`,
      keepLabel: "대신 원하는 성분 남기기",
    };
  }

  const [{ ingredientId, code }] = removed;
  const name = names.get(ingredientId) ?? "성분";
  const topic = `‘${name}’${josaOf(name, "은/는")}`;
  if (!code) {
    return {
      text: `링크 조건 중 ${topic} 피하고 싶은 성분에도 있어서 원하는 성분에서 뺐어요.`,
      keepLabel: `대신 ${name} 남기기`,
    };
  }

  const codeName = excludeCodes.find((item) => item.code === code)?.name ?? "피하고 싶은 성분";
  return {
    text: `링크 조건 중 ${topic} ‘${codeName}’ 피하기와 함께 쓸 수 없어서 뺐어요.`,
    keepLabel: `대신 ${name} 남기기`,
  };
};

/**
 * 링크 조건 자동 정리 안내(명세 S36). 주소로 들어온 조건이 서로 부딪혀 원하는 성분 쪽을 뺐을 때 목록 맨 위에 붙인다.
 * 사용자가 하지 않은 변경을 알리는 자리라 안내 줄(FEEDBACK F05)을 쓴다.
 */
export function LinkCleanupNotice({
  removed,
  names,
  excludeCodes,
  onKeepInstead,
  onShowConditions,
  onClose,
}: LinkCleanupNoticeProps) {
  const { text, keepLabel } = messageOf(removed, names, excludeCodes);

  return (
    <Notice
      actions={[
        { label: keepLabel, onClick: onKeepInstead },
        { label: "조건 보기", onClick: onShowConditions },
      ]}
      onClose={onClose}
    >
      {text}
    </Notice>
  );
}
