"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { ingredientReferences } from "@/lib/domain/ingredient-references";

/**
 * S25 참고자료. 처음에는 건수와 갱신일만 보여 주고, 누르면 자료 목록을 편다(S25b).
 *
 * 접힌 목록도 문서에 그려 두고 보이기만 감춘다. 출처는 검색 로봇이 성분 설명의 근거로 읽는 글이다.
 */
export function IngredientReferences({
  infoSources,
  effectSources,
  updatedAt,
}: {
  readonly infoSources: readonly string[];
  readonly effectSources: readonly string[];
  readonly updatedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const references = ingredientReferences(infoSources, effectSources);

  if (references.length === 0) return null;

  // 서버와 브라우저의 시간대가 달라도 같은 날짜가 나오게 한국 시간으로 고정한다. 다르면 날이 바뀌는 무렵에 화면이 어긋난다.
  const date = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(
    new Date(updatedAt),
  );

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex min-h-11 w-full items-center gap-1 border-b border-[#DEE2E9] text-left text-[13px]"
      >
        <Icon name="info" size={15} className="shrink-0 text-[#6A7588]" />
        <span className="font-medium text-[#566273]">참고자료 {references.length}건</span>
        <span className="min-w-0 flex-1 text-[#6A7588]">· {date} 업데이트</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} className="shrink-0 text-[#6A7588]" />
      </button>

      <ul id={listId} hidden={!open} className="pb-1">
        {references.map((reference) => (
          <li key={reference.source} className="flex flex-col gap-1 py-3">
            <span className="text-[13px] leading-[1.45] font-medium text-[#182132]">{reference.source}</span>
            <span className="text-[12px] font-medium text-[#424E5F]">{reference.usage}에 반영</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
