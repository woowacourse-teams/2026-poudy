"use client";

import { cn } from "@poudy/design-system/cn";

import type { YouTubeMention, YouTubeVideo } from "@/lib/api/youtube";
import { isLongVideo, timestamp } from "@/lib/youtube-format";

/** 영상 안 언급 한 줄. 같은 제품을 여러 번 말했으면 가장 이른 시각 하나로 합치고, 그때의 의견은 영상×제품의 의견이다. */
export type VideoMentionLine = {
  readonly mention: YouTubeMention;
  readonly recommendation: string;
};

/**
 * 영상의 언급을 시각 순서로 늘어놓고 같은 제품은 한 줄로 합친다(기존 동작). 원본 언급은 그대로 두고 보이는 줄만 줄인다.
 * 합친 줄의 태그는 숨긴 언급의 의견까지 담도록 영상×제품의 의견(videoRecommendation)을 쓴다.
 * 제품으로 걸렀으면 그 제품의 줄만 남긴다.
 */
export const videoMentionLines = (video: YouTubeVideo, productId?: number): readonly VideoMentionLine[] => {
  const sorted = [...video.mentions].sort((a, b) => a.startMs - b.startMs || a.ordinal - b.ordinal);
  return sorted
    .filter((mention, index) => sorted.findIndex((other) => other.productId === mention.productId) === index)
    .filter((mention) => productId === undefined || mention.productId === productId)
    .map((mention) => ({
      mention,
      recommendation:
        video.mentions.filter((other) => other.productId === mention.productId).length > 1
          ? mention.videoRecommendation
          : mention.recommendation,
    }));
};

/**
 * 언급 시각 칩(명세 S295·S296). 모든 줄의 시각을 같은 자리(44×24, 1시간 넘는 영상은 60)에 두어 재생 중 표시가 켜져도
 * 자리가 움직이지 않는다. 재생 중이면 면 ui-brand-text · 글자 ui-background 로 채운다. 글자색 토큰을 면에 쓰는 이 조합은
 * 이 자리만의 명세 예외다(2026-11-18 사용자 결정).
 */
export function TimeChip({
  ms,
  long,
  playing = false,
}: {
  readonly ms: number;
  readonly long: boolean;
  readonly playing?: boolean;
}) {
  return (
    <time
      className={cn(
        "flex h-6 shrink-0 items-center justify-center rounded-full text-body-sm leading-none font-semibold tabular-nums transition-colors duration-(--duration-fast)",
        long ? "w-15" : "w-11",
        playing ? "bg-brand-text text-background" : "text-brand-text",
      )}
    >
      {timestamp(ms)}
    </time>
  );
}

/** 이 영상의 시각 칩이 넓은 자리(60)를 쓰는지 */
export const usesLongChip = (video: YouTubeVideo) => isLongVideo(video.durationMs);
