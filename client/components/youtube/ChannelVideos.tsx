"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import type { CSSProperties } from "react";

import { OpinionTag } from "./Opinion";
import {
  TimeChip,
  timeChipSlot,
  timeChipWidth,
  videoMentionLines,
  type TimeChipSlot,
  type VideoMentionLine,
} from "./VideoMentions";
import { VideoThumbnail } from "./YouTubeUI";

import { AttributionLink } from "@/components/analytics/AttributionLink";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductFeatureContext } from "@/lib/analytics/events";
import type { YouTubeProduct, YouTubeVideo } from "@/lib/api/youtube";
import { formatDate, formatNumber } from "@/lib/domain/format";
import { keepWords } from "@/lib/youtube-format";

type ChannelVideosProps = {
  readonly videos: readonly YouTubeVideo[];
  /** 제품으로 걸렀으면 그 제품(S294). 위에 제품 행을 두고 그 제품을 말한 영상과 언급만 보인다. */
  readonly selected: YouTubeProduct | undefined;
  /** 거르기 전의 영상 수. '전체 영상 N개 보기'에 쓴다. */
  readonly totalCount: number;
  /** 제품 상세로 갈 때 함께 보관할 기능 문맥 */
  readonly featureContext: ProductFeatureContext;
  readonly onOpenVideo: (video: YouTubeVideo) => void;
  readonly onPlayMention: (video: YouTubeVideo, line: VideoMentionLine) => void;
  readonly onProductNavigate: (productId: number, videoId?: string) => void;
  readonly onClearFilter: () => void;
};

/**
 * 유튜버 상세의 영상 탭(명세 S293 · S294). 영상별로 묶고 그 아래 언급(시각 · 의견 · 요약 · 제품)을 둔다.
 * 영상 머리를 누르면 처음부터, 언급을 누르면 그 시각부터 재생 시트가 열린다. 언급 아래 제품 줄은 제품 상세로 가는 링크다.
 */
export function ChannelVideos({
  videos,
  selected,
  totalCount,
  featureContext,
  onOpenVideo,
  onPlayMention,
  onProductNavigate,
  onClearFilter,
}: ChannelVideosProps) {
  return (
    <div className="flex flex-col">
      {selected ? (
        <>
          <SelectedProductRow
            product={selected}
            featureContext={featureContext}
            onNavigate={() => onProductNavigate(selected.id)}
          />
          <h2 className="pt-4 pb-3 text-body-sm font-semibold text-text-primary">
            이 제품을 말한 영상 {formatNumber(videos.length)}
          </h2>
        </>
      ) : null}
      {videos.length === 0 ? (
        <p className="py-12 text-center text-body text-text-secondary">표시할 영상이 없어요.</p>
      ) : null}
      {videos.map((video) => (
        <article
          key={video.id}
          id={`youtube-video-${video.id}`}
          className="flex flex-col border-b border-border py-4 first-of-type:pt-0"
        >
          <VideoHead video={video} onOpen={() => onOpenVideo(video)} />
          <ul className="flex flex-col">
            {videoMentionLines(video, selected?.id).map((line) => (
              <li key={line.mention.ordinal}>
                <MentionLine
                  line={line}
                  slot={timeChipSlot(video)}
                  featureContext={{ ...featureContext, video_id: video.id }}
                  onPlay={() => onPlayMention(video, line)}
                  onNavigate={() => onProductNavigate(line.mention.productId, video.id)}
                />
              </li>
            ))}
          </ul>
        </article>
      ))}
      {selected ? (
        <div className="pt-4">
          <ClearFilterButton count={totalCount} onClick={onClearFilter} />
        </div>
      ) : null}
    </div>
  );
}

/** 제목 칸이 이보다 좁아지면 썸네일 아래 줄로 내려 화면 폭을 쓴다. 글자를 따라 커지는 ch 로 잡아, 기본 배율에서는 썸네일 옆에 둔다. */
const TITLE_MIN_WIDTH = "20ch";

/**
 * 영상 머리. 썸네일 96×54 와 제목(두 줄까지) · 올린 날. 누르면 처음부터 재생한다.
 * 기기 글자 크기를 키워 제목 칸이 좁아지면 제목을 썸네일 아래로 내려, 낱말이 칸보다 길어 갈라지지 않게 한다.
 * hover 면은 아래 언급 줄 · 걸러 둔 제품 행과 같이 화면 폭 끝까지 깐다(fb-bleed, STATE S04).
 */
function VideoHead({ video, onOpen }: { readonly video: YouTubeVideo; readonly onOpen: () => void }) {
  const { pressableProps } = usePressable();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${video.title} 재생`}
      {...pressableProps}
      className="pressable fb-bleed flex flex-wrap items-center gap-3 pb-2 text-left select-none"
    >
      <VideoThumbnail src={video.thumbnailUrl} size="md" />
      <span
        style={{ "--title-min": TITLE_MIN_WIDTH } as CSSProperties}
        // ch 를 제목 글자(13)로 풀도록 글자 크기를 이 칸에 둔다.
        className="flex min-w-0 flex-1 basis-(--title-min) flex-col gap-0.5 text-body-sm"
      >
        <span className="line-clamp-2 text-body-sm font-semibold text-text-primary">{keepWords(video.title)}</span>
        <span className="text-caption text-text-secondary">{formatDate(video.publishedAt)}</span>
      </span>
    </button>
  );
}

/**
 * 언급 한 줄. 시각 · 의견 태그 · 요약은 그 시각부터 재생하는 버튼이고, 그 아래 '브랜드 · 제품명'은 제품 상세로 가는 링크다.
 * 두 동작을 한 버튼 안에 겹치지 않도록 나눈다. 재생 버튼의 누르는 영역은 줄 전체로 넓히고 링크만 그 위에 올린다.
 * 어느 쪽에 올려도 hover 면은 시각부터 제품 줄까지 화면 폭 끝까지 깐다(S296 '언급 줄 hover 견본', STATE S04).
 */
function MentionLine({
  line,
  slot,
  featureContext,
  onPlay,
  onNavigate,
}: {
  readonly line: VideoMentionLine;
  readonly slot: TimeChipSlot;
  readonly featureContext: ProductFeatureContext;
  readonly onPlay: () => void;
  readonly onNavigate: () => void;
}) {
  const play = usePressable({ delayMs: 80 });
  const link = usePressable({ delayMs: 80 });
  const { mention } = line;
  return (
    // 면은 줄의 가상 요소로 거터만큼 넓혀 그려 레이아웃은 그대로다. 버튼이나 링크가 반응하면 켠다.
    // 재생 버튼의 포커스 링은 버튼 대신 줄에 그린다. 버튼만 감싸면 링이 요약에서 끊겨 제품 줄이 빠진다(STATE S06).
    // 거터 밖으로 넓힌 면 대신 다른 폭 가득 행(fb-bleed)처럼 줄의 상자를 따라 그린다. 제품 링크는 제 링을 그대로 쓴다.
    <div className="relative isolate flex flex-col before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-(--gutter) before:-z-10 before:transition-colors before:duration-(--duration-fast) has-[>[data-hovered]]:before:bg-hover has-[>[data-pressed]]:before:bg-hover has-[>[data-pressed]]:before:duration-0 has-[>button:focus-visible]:outline-(length:--focus-ring-width) has-[>button:focus-visible]:outline-offset-(--focus-ring-offset) has-[>button:focus-visible]:outline-focus-ring">
      {/* 버튼을 static 으로 두어 누르는 영역(after)이 버튼이 아니라 줄 전체를 덮게 한다. */}
      <button
        type="button"
        onClick={onPlay}
        {...play.pressableProps}
        className="pressable static flex items-start gap-3 rounded-xl px-2 pt-2 pb-1 text-left select-none after:absolute after:inset-y-0 after:-inset-x-(--gutter) focus-visible:outline-none"
      >
        <TimeChip ms={mention.startMs} slot={slot} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <OpinionTag recommendation={line.recommendation} />
          <span className="text-body font-semibold text-text-primary">{keepWords(mention.summary)}</span>
        </span>
      </button>
      <AttributionLink
        entryPoint="youtube"
        featureContext={featureContext}
        href={`/products/${mention.productId}`}
        onNavigate={onNavigate}
        {...link.pressableProps}
        // 제품 줄은 요약과 같은 세로 선에서 시작한다. 시각 칩 폭(13 글자 기준)을 이 줄의 글자(12)로 다시 셈하고, 칩 옆 12 와 줄 안쪽 8 을 더한다.
        style={{ "--time-indent": `calc(${timeChipWidth(slot, 13 / 12)} + var(--spacing) * 5)` } as CSSProperties}
        className="pressable z-10 self-start pr-2 pb-2 pl-(--time-indent) text-caption text-text-secondary select-none data-hovered:underline data-pressed:underline"
      >
        {/* 포커스 링은 글자에만 그린다. 링크 상자에 그리면 링이 시각 칩 자리(안쪽 여백)부터 시작해 글자 앞이 빈다. */}
        <span data-focus-ring="">
          {mention.brandName} · {mention.productName}
        </span>
      </AttributionLink>
    </div>
  );
}

/** 걸러 둔 제품 행(S294). 누르면 제품 상세로 간다. hover 면은 화면 폭 끝까지 깐다(S04). */
function SelectedProductRow({
  product,
  featureContext,
  onNavigate,
}: {
  readonly product: YouTubeProduct;
  readonly featureContext: ProductFeatureContext;
  readonly onNavigate: () => void;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <AttributionLink
      entryPoint="youtube"
      featureContext={featureContext}
      href={`/products/${product.id}`}
      onNavigate={onNavigate}
      aria-label={`${product.brandName} ${product.name} 제품 상세`}
      {...pressableProps}
      className="pressable fb-bleed flex items-center gap-3 border-b border-border py-3 select-none"
    >
      <ProductImage src={product.imageUrl ?? ""} size={48} className="shrink-0 rounded-md bg-surface p-1.5" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-caption text-text-secondary">{product.brandName}</span>
        <span className="line-clamp-2 text-body-sm font-semibold text-text-primary">{product.name}</span>
      </span>
      <Icon name="chevron-right" size={16} className="shrink-0 text-text-secondary" />
    </AttributionLink>
  );
}

/** 거르기를 푸는 폭 가득 글자 버튼(높이 44, 로그인 화면 '로그인 없이 둘러보기'와 같은 규격). */
function ClearFilterButton({ count, onClick }: { readonly count: number; readonly onClick: () => void }) {
  const { pressableProps } = usePressable();
  return (
    <button
      type="button"
      onClick={onClick}
      {...pressableProps}
      className="pressable fb-surface flex h-11 w-full items-center justify-center rounded-xl border border-border px-3 text-body leading-snug font-semibold text-text-secondary select-none"
    >
      전체 영상 {formatNumber(count)}개 보기
    </button>
  );
}
