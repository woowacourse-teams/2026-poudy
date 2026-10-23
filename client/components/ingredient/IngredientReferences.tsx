"use client";

import { Disclosure, DisclosureContent, DisclosureIcon, DisclosureTrigger } from "@poudy/design-system/disclosure";
import { Icon } from "@poudy/design-system/icon";

import { formatDate } from "@/lib/domain/format";
import { ingredientReferenceHref, ingredientReferences } from "@/lib/domain/ingredient-references";

/**
 * S25 참고자료. 처음에는 건수와 갱신일만 보여 주고, 누르면 그 자리에서 자료 목록을 편다(S25b).
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
    <section>
      <Disclosure>
        <DisclosureTrigger>
          <button
            type="button"
            className="fb-surface flex min-h-11 w-full items-center gap-1 border-b border-border text-left text-body-sm leading-snug text-text-muted"
          >
            <Icon name="book" size={14} scalable />
            {/* 글자를 키워 한 줄에 다 들어가지 않으면 날짜를 통째로 다음 줄로 넘긴다. 낱말 가운데서 끊지 않는다. */}
            <span className="flex min-w-0 flex-1 flex-wrap gap-x-1">
              <span className="font-medium text-text-secondary">참고자료 {references.length}건</span>
              <span className="break-keep">· {date} 업데이트</span>
            </span>
            <DisclosureIcon size={14} />
          </button>
        </DisclosureTrigger>

        <DisclosureContent>
          <p className="py-3 text-caption text-text-muted">
            성분 정보와 피부 작용을 분류할 때 참고한 자료예요. 완제품의 효과를 검증한 자료는 아니에요.
          </p>
          <ul className="flex flex-col pb-1">
            {references.map((reference) => (
              <li key={reference.source} className="flex flex-col gap-1 py-3">
                {ingredientReferenceHref(reference.source) ? (
                  <a
                    href={ingredientReferenceHref(reference.source)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm leading-snug font-medium break-words text-text-primary underline"
                  >
                    {reference.source}
                  </a>
                ) : (
                  <span className="text-body-sm leading-snug font-medium break-words text-text-primary">
                    {reference.source}
                  </span>
                )}
                <span className="text-caption font-medium text-text-body">{reference.usage}에 반영</span>
              </li>
            ))}
          </ul>
        </DisclosureContent>
      </Disclosure>
    </section>
  );
}
