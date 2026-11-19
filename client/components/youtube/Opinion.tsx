import { cn } from "@poudy/design-system/cn";
import { Tag, type TagTone } from "@poudy/design-system/tag";
import { type CSSProperties, Fragment } from "react";

import type { OpinionCounts, YouTubeVideo } from "@/lib/api/youtube";
import { formatNumber } from "@/lib/domain/format";

/**
 * 언급 하나의 의견(recommendation). 서버 값 다섯 가지를 그대로 대응시킨다(명세 JQgqk).
 * 정보성 언급·판단 어려움은 색 없이 글자만 다르다. 모르는 값은 정보성 언급으로 본다.
 */
const OPINIONS: Readonly<Record<string, { readonly label: string; readonly tone: TagTone }>> = {
  recommended: { label: "추천", tone: "success" },
  mixed: { label: "엇갈림", tone: "info" },
  not_recommended: { label: "비추천", tone: "warning" },
  neutral: { label: "정보성 언급", tone: "muted" },
  uncertain: { label: "판단 어려움", tone: "muted" },
};

export const opinionLabel = (recommendation: string) => (OPINIONS[recommendation] ?? OPINIONS.neutral).label;

/**
 * 의견 태그(높이 24, 11/700). 홈 유튜버 섹션, 유튜버 상세의 영상 탭과 재생 시트, 제품 상세의 유튜브 섹션이 함께 쓴다.
 * 추천만큼 엇갈림과 비추천도 드러내는 것이 이 표지의 목적이다.
 */
export function OpinionTag({ recommendation }: { readonly recommendation: string }) {
  const opinion = OPINIONS[recommendation] ?? OPINIONS.neutral;
  return (
    <Tag variant="label" tone={opinion.tone}>
      {opinion.label}
    </Tag>
  );
}

/**
 * 채널이 받은 영상에서 의견 수를 센다. 서버의 의견 수와 같은 단위(영상×제품)로 세려고, 한 영상에서 같은 제품을 여러 번
 * 말했으면 한 번만 세고 영상×제품의 의견(videoRecommendation)을 쓴다.
 */
export const countOpinions = (videos: readonly YouTubeVideo[]): OpinionCounts => {
  const counts = { recommended: 0, mixed: 0, notRecommended: 0, other: 0 };
  for (const video of videos) {
    const seen = new Set<number>();
    for (const mention of video.mentions) {
      if (seen.has(mention.productId)) continue;
      seen.add(mention.productId);
      if (mention.videoRecommendation === "recommended") counts.recommended += 1;
      else if (mention.videoRecommendation === "mixed") counts.mixed += 1;
      else if (mention.videoRecommendation === "not_recommended") counts.notRecommended += 1;
      else counts.other += 1;
    }
  }
  return counts;
};

/** 막대 조각. 글자색 토큰을 면에 쓴다(명세 S289 · S291 그대로). 그 외는 회색이다. */
const SEGMENTS = [
  { key: "recommended", label: "추천", className: "bg-success-text" },
  { key: "mixed", label: "엇갈림", className: "bg-info-text" },
  { key: "notRecommended", label: "비추천", className: "bg-warning-text" },
  { key: "other", label: "그 외", className: "bg-icon-subtle" },
] as const;

/**
 * '추천 4 · 엇갈림 2'. 글자를 키워 줄이 바뀌어도 '그 외 0'처럼 이름과 수가 떨어지지 않게, 항목마다 한 덩어리로 묶고
 * 가운뎃점 뒤에서만 줄을 바꾼다.
 */
const countText = (counts: OpinionCounts, keys: readonly (typeof SEGMENTS)[number]["key"][]) =>
  SEGMENTS.filter((segment) => keys.includes(segment.key)).map((segment, index) => (
    <Fragment key={segment.key}>
      {index > 0 ? " · " : null}
      <span className="whitespace-nowrap">
        {segment.label} {formatNumber(counts[segment.key])}
      </span>
    </Fragment>
  ));

/**
 * 의견 막대와 수(명세 S289 목록 행 · S291 채널 정보 아래). 막대는 높이 6, 조각 사이 2 이고 0 인 조각은 그리지 않는다.
 * 수는 0 도 적는다(명세 견본 '추천 3 · 엇갈림 0'). 의견이 하나도 없으면 아무것도 그리지 않는다.
 *
 * - list: 목록 행 오른쪽 132 칸. 수를 두 줄('추천 · 엇갈림' / '비추천 · 그 외')로 오른쪽에 맞춘다.
 * - detail: 채널 정보 아래 폭 가득. 수를 한 줄로 적는다.
 */
export function OpinionBar({
  counts,
  variant,
  className,
}: {
  readonly counts: OpinionCounts;
  readonly variant: "list" | "detail";
  readonly className?: string;
}) {
  const total = counts.recommended + counts.mixed + counts.notRecommended + counts.other;
  if (total === 0) return null;
  const list = variant === "list";

  return (
    <div className={cn("flex flex-col", list ? "w-33 items-end gap-1" : "gap-2", className)}>
      <div aria-hidden="true" className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        {SEGMENTS.filter((segment) => counts[segment.key] > 0).map((segment) => (
          // 조각의 폭은 의견 수의 비율이라 값마다 다르다. 클래스로 적을 수 없어 비율을 CSS 변수로 넘긴다.
          <span
            key={segment.key}
            className={cn("h-full grow-(--share) basis-0", segment.className)}
            style={{ "--share": counts[segment.key] } as CSSProperties}
          />
        ))}
      </div>
      {list ? (
        <p className="text-right text-caption font-medium text-text-secondary tabular-nums">
          {countText(counts, ["recommended", "mixed"])}
          <br />
          {countText(counts, ["notRecommended", "other"])}
        </p>
      ) : (
        <p className="text-caption text-text-secondary tabular-nums">
          {countText(counts, ["recommended", "mixed", "notRecommended", "other"])}
        </p>
      )}
    </div>
  );
}
