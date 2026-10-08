"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { PRESS_TEXT } from "@/components/ui/press";
import { ingredientReferences } from "@/lib/domain/ingredient-references";

/**
 * S25 참고자료. 처음에는 건수와 갱신일만 보여 주고, 누르면 자료 목록을 편다(S25b).
 *
 * 접힌 목록도 문서에 그려 두고 높이만 접는다. 출처는 검색 로봇이 성분 설명의 근거로 읽는 글이다.
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
        className={`flex min-h-11 w-full items-center gap-1 border-b border-[#DEE2E9] text-left text-[13px] ${PRESS_TEXT}`}
      >
        <Icon name="info" size={15} scalable className="shrink-0 text-[#6A7588]" />
        {/* 글자를 키워 한 줄에 다 들어가지 않으면 날짜를 통째로 다음 줄로 넘긴다. 낱말 가운데서 끊지 않는다. */}
        <span className="flex min-w-0 flex-1 flex-wrap gap-x-1">
          <span className="font-medium text-[#566273]">참고자료 {references.length}건</span>
          <span className="break-keep text-[#6A7588]">· {date} 업데이트</span>
        </span>
        {/* 목록이 열리는 것과 같은 길이로 화살표를 돌린다. 전환은 disclosure-chevron 이 건다. */}
        <Icon
          name="chevron-down"
          size={18}
          scalable
          className={`disclosure-chevron shrink-0 text-[#6A7588] ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/*
        접힌 목록도 문서에 남겨 둔 채 높이만 0 으로 접는다. 열고 닫는 전환은 두 높이 사이를 잇는 것이라
        한쪽이 없으면 걸리지 않는다. 접힌 동안에는 `inert` 로 손과 초점, 보조 기술을 막는다.
      */}
      <div id={listId} className="disclosure" data-open={open}>
        <div>
          <ul inert={!open} className="pb-1">
            {references.map((reference) => (
              <li key={reference.source} className="flex flex-col gap-1 py-3">
                <span className="text-[13px] leading-[1.45] font-medium text-[#182132]">{reference.source}</span>
                <span className="text-[12px] font-medium text-[#424E5F]">{reference.usage}에 반영</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
