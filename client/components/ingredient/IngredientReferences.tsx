"use client";

import { cn } from "@poudy/design-system/cn";
import { Disclosure, DisclosureContent, DisclosureIcon, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { ReactNode } from "react";

import { formatDate } from "@/lib/domain/format";
import { ingredientReferenceHref, ingredientReferences } from "@/lib/domain/ingredient-references";
import type { IngredientReference } from "@/lib/domain/ingredient-references";

/**
 * S245 참고자료. 처음에는 건수와 갱신일만 보여 주고, 누르면 그 자리에서 자료 목록을 편다(S246).
 * 머리부터 목록까지 회색 판 하나에 담는다. 접혀 있어도 머리만 담은 판을 두고, 펼치면 판이 아래로만 늘어난다.
 *
 * 머리와 원문 링크 행은 판 끝까지 hover 면을 칠하므로 판의 좌우 여백을 행이 각자 가진다.
 * 구분선은 행 안쪽 칸에 그려 판의 여백만큼 들어가 있다.
 *
 * 접힌 목록도 첫 HTML 에 그려 두고 hidden 으로만 감춘다. 출처는 검색 로봇이 성분 설명의 근거로 읽는 글이다.
 * 펼칠 때 꺾쇠만 돌고 목록은 바로 나타난다(MOTION 펼치기·접기).
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
  const references = ingredientReferences(infoSources, effectSources);

  if (references.length === 0) return null;

  // formatDate 는 한국 시간으로 날짜를 고정한다. 서버와 브라우저의 시간대가 달라도 같은 날짜가 나온다.
  const date = formatDate(updatedAt);

  return (
    <section className="rounded-2xl bg-surface">
      <Disclosure>
        <DisclosureTrigger>
          <button
            type="button"
            className="fb-border flex min-h-11 w-full items-center gap-1 rounded-2xl px-4 text-left text-body-sm text-text-secondary data-[state=open]:rounded-b-none"
          >
            <Icon name="book" size={14} scalable className="text-text-muted" />
            {/* 글자를 키워 한 줄에 다 들어가지 않으면 날짜를 통째로 다음 줄로 넘긴다. 낱말 가운데서 끊지 않는다. */}
            <span className="flex min-w-0 flex-1 flex-wrap gap-x-1">
              <span className="leading-snug font-medium">참고자료 {references.length}건</span>
              <span className="break-keep">· {date} 업데이트</span>
            </span>
            {/* 꺾쇠는 놓인 줄의 글자색을 따른다. 아이콘만 muted 로 둔다. */}
            <span className="flex text-text-muted">
              <DisclosureIcon size={14} />
            </span>
          </button>
        </DisclosureTrigger>

        <DisclosureContent>
          <div className="flex flex-col pb-1">
            <div className="px-4">
              <p className="border-t border-border pt-3 pb-1 text-caption text-text-secondary">
                성분 정보와 피부 작용을 분류할 때 참고한 자료예요. 완제품의 효과를 검증한 자료는 아니에요.
              </p>
            </div>
            <ul className="flex flex-col">
              {references.map((reference, index) => (
                <li key={reference.source}>
                  <ReferenceRow reference={reference} last={index === references.length - 1} />
                </li>
              ))}
            </ul>
          </div>
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}

/**
 * APP · 참고자료 항목(qRcfV). 반영 태그 줄 아래에 자료명을 둔다. 원문 링크가 있으면 행 전체가 원문 링크다.
 * 회색 판 위라 hover·눌림은 한 단계 진한 면(fb-border)이다. 마지막 행은 판의 아래 모서리를 따라 둥글린다.
 */
function ReferenceRow({ reference, last }: { readonly reference: IngredientReference; readonly last: boolean }) {
  const href = ingredientReferenceHref(reference.source);
  const body = (
    <span className={cn("flex flex-col gap-1 py-3", !last && "border-b border-border")}>
      <span className="flex flex-wrap gap-1">
        {reference.usages.map((usage) => (
          <UsageTag key={usage}>{usage}</UsageTag>
        ))}
      </span>
      <span className={cn("text-body-sm font-medium break-words text-text-primary", href && "underline")}>
        {reference.source}
      </span>
    </span>
  );

  if (!href) return <div className="px-4">{body}</div>;

  return (
    <ReferenceLink href={href} last={last}>
      {body}
    </ReferenceLink>
  );
}

function ReferenceLink({
  href,
  last,
  children,
}: {
  readonly href: string;
  readonly last: boolean;
  readonly children: ReactNode;
}) {
  const { pressableProps } = usePressable();

  return (
    <a
      {...pressableProps}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("pressable fb-border block px-4", last && "rounded-b-2xl")}
    >
      {children}
    </a>
  );
}

/** 반영 태그. 읽기 전용이라 누를 수 없다. 흰 면에 진한 테두리, label 11/600. */
function UsageTag({ children }: { readonly children: ReactNode }) {
  return (
    <span className="rounded-full border border-border-strong bg-background px-2 py-0.5 text-label font-semibold text-text-body">
      {children}
    </span>
  );
}
