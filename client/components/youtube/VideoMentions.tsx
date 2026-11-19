"use client";

import { cn } from "@poudy/design-system/cn";
import type { CSSProperties } from "react";

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
 * 한 영상의 시각 칩 자리. 기본 배율에서는 .pen대로 44(1시간 넘는 영상은 60)이고, 기기 글자 크기를 키우면 그 영상에서
 * 가장 긴 시각을 담을 만큼 넓어진다. 폭을 영상마다 하나로 정해 같은 영상의 모든 줄이 함께 넓어지므로 줄마다 자리가 어긋나지 않는다.
 *
 * 글자를 따라 커지는 단위는 ch 다(실제 WebView 는 em · rem 을 키우지 않는다). 시각은 tabular-nums 라 숫자 하나가 1ch 이고,
 * 쌍점은 그보다 좁아, 글자 수만큼의 ch 면 양옆에 여유가 남는다. 기본 배율에서는 이 값이 44 · 60 보다 작아 .pen 폭 그대로다.
 */
export type TimeChipSlot = {
  /** 시각 글자 수의 최댓값 */
  readonly chars: number;
  /** 기본 배율의 칸 폭(spacing 단계). 44 는 11, 60 은 15 */
  readonly minSpacing: 11 | 15;
};

export const timeChipSlot = (video: YouTubeVideo): TimeChipSlot => ({
  chars: Math.max(4, ...video.mentions.map((mention) => timestamp(mention.startMs).length)),
  minSpacing: isLongVideo(video.durationMs) ? 15 : 11,
});

/** 칸 폭 식. scale 은 이 식을 쓰는 글자 크기와 시각 글자 크기(13)의 비율이다. ch 는 쓰는 요소의 글자 크기로 풀리기 때문이다. */
export const timeChipWidth = ({ chars, minSpacing }: TimeChipSlot, scale = 1) =>
  `max(calc(var(--spacing) * ${minSpacing}), ${Math.ceil(chars * scale * 100) / 100}ch)`;

/**
 * 언급 시각 칩(명세 S295·S296). 모든 줄의 시각을 같은 자리에 두어 재생 중 표시가 켜져도 자리가 움직이지 않는다.
 * 재생 중이면 면 ui-brand-text · 글자 ui-background 로 채운다. 글자색 토큰을 면에 쓰는 이 조합은 이 자리만의 명세 예외다
 * (2026-11-18 사용자 결정). 높이는 24 에서 시작해 글자를 따라 커진다.
 */
export function TimeChip({
  ms,
  slot,
  playing = false,
}: {
  readonly ms: number;
  readonly slot: TimeChipSlot;
  readonly playing?: boolean;
}) {
  return (
    <time
      // 칸 폭은 영상마다 달라 클래스로 적을 수 없다. 식을 CSS 변수로 넘긴다.
      style={{ "--time-chip": timeChipWidth(slot) } as CSSProperties}
      className={cn(
        "flex min-h-6 w-(--time-chip) shrink-0 items-center justify-center rounded-full text-body-sm leading-none font-semibold whitespace-nowrap tabular-nums transition-colors duration-(--duration-fast)",
        playing ? "bg-brand-text text-background" : "text-brand-text",
      )}
    >
      {timestamp(ms)}
    </time>
  );
}
