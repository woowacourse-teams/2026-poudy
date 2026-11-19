"use client";

import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";

import { OpinionTag } from "./Opinion";
import { TimeChip, usesLongChip, videoMentionLines, type VideoMentionLine } from "./VideoMentions";
import { VideoThumbnail } from "./YouTubeUI";

import { AttributionLink } from "@/components/analytics/AttributionLink";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductFeatureContext } from "@/lib/analytics/events";
import type { YouTubeProduct, YouTubeVideo } from "@/lib/api/youtube";
import { formatDate, formatNumber } from "@/lib/domain/format";

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
                  long={usesLongChip(video)}
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

/** 영상 머리. 썸네일 96×54 와 제목(두 줄까지) · 올린 날. 누르면 처음부터 재생한다. */
function VideoHead({ video, onOpen }: { readonly video: YouTubeVideo; readonly onOpen: () => void }) {
  const { pressableProps } = usePressable();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${video.title} 재생`}
      {...pressableProps}
      className="pressable fb-surface flex items-center gap-3 rounded-sm pb-2 text-left select-none"
    >
      <VideoThumbnail src={video.thumbnailUrl} size="md" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-body-sm font-semibold text-text-primary">{video.title}</span>
        <span className="text-caption text-text-secondary">{formatDate(video.publishedAt)}</span>
      </span>
    </button>
  );
}

/**
 * 언급 한 줄. 시각 · 의견 태그 · 요약은 그 시각부터 재생하는 버튼이고, 그 아래 '브랜드 · 제품명'은 제품 상세로 가는 링크다.
 * 두 동작을 한 버튼 안에 겹치지 않도록 나눈다.
 */
function MentionLine({
  line,
  long,
  featureContext,
  onPlay,
  onNavigate,
}: {
  readonly line: VideoMentionLine;
  readonly long: boolean;
  readonly featureContext: ProductFeatureContext;
  readonly onPlay: () => void;
  readonly onNavigate: () => void;
}) {
  const play = usePressable();
  const link = usePressable();
  const { mention } = line;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onPlay}
        {...play.pressableProps}
        className="pressable fb-surface flex items-start gap-3 rounded-xl px-2 pt-2 pb-1 text-left select-none"
      >
        <TimeChip ms={mention.startMs} long={long} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <OpinionTag recommendation={line.recommendation} />
          <span className="text-body font-semibold text-text-primary">{mention.summary}</span>
        </span>
      </button>
      <AttributionLink
        entryPoint="youtube"
        featureContext={featureContext}
        href={`/products/${mention.productId}`}
        onNavigate={onNavigate}
        {...link.pressableProps}
        className={`pressable self-start pr-2 pb-2 text-caption text-text-secondary select-none data-hovered:underline data-pressed:underline ${long ? "pl-20" : "pl-16"}`}
      >
        {mention.brandName} · {mention.productName}
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
