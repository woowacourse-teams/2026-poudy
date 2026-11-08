"use client";

import type { YouTubeChannelResponse, YouTubeProductResponse, YouTubeVideoResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import { Icon } from "@poudy/design-system/icon";
import { TopBar } from "@poudy/design-system/top-bar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChannelAvatar, ChannelBanner, PlayIcon, RecommendationBadge } from "./YouTubeUI";

import { AttributionLink as ProductLink } from "@/components/analytics/AttributionLink";
import { useTrackedView } from "@/components/analytics/useTrackedView";
import { ProductImage } from "@/components/ui/ProductImage";
import { featureFlowFor } from "@/lib/analytics/feature-flow";
import { track } from "@/lib/analytics/track";
import { countLabel, dateLabel, timestamp } from "@/lib/youtube-format";

type Tab = "products" | "videos";
export function ChannelDetail({
  channel,
  products,
  videos,
  initialTab = "products",
  initialProduct,
}: {
  readonly channel: YouTubeChannelResponse;
  readonly products: readonly YouTubeProductResponse[];
  readonly videos: readonly YouTubeVideoResponse[];
  readonly initialTab?: Tab;
  readonly initialProduct?: number;
}) {
  const mainRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filter, setFilter] = useState<number | undefined>(
    products.some((p) => p.id === initialProduct) ? initialProduct : undefined,
  );
  const [sort, setSort] = useState("recommendations");
  const [playing, setPlaying] = useState<{ readonly videoId: string; readonly ms: number }>();
  useEffect(() => {
    mainRef.current?.scrollIntoView?.({ block: "start" });
  }, [tab, filter]);
  const flow = featureFlowFor("youtube", channel.id);
  useTrackedView(
    "youtube_channel_viewed",
    {
      ...flow,
      channel_id: channel.id,
      initial_tab: initialTab,
      product_count: products.length,
      video_count: videos.length,
    },
    { key: channel.id },
  );
  const play = (
    videoId: string,
    ms: number,
    context: {
      readonly placement: "thumbnail" | "mention_timestamp" | "product_timestamp";
      readonly productId?: number;
    },
  ) => {
    track("youtube_video_play_requested", {
      ...flow,
      channel_id: channel.id,
      video_id: videoId,
      start_ms: ms,
      placement: context.placement,
      product_id: context.productId,
    });
    setPlaying({ videoId, ms });
    document.getElementById(`youtube-video-${videoId}`)?.scrollIntoView?.({ block: "start" });
  };
  const selected = products.find((p) => p.id === filter);
  const filteredVideos = videos.filter((v) => !selected || v.mentions.some((m) => m.productId === selected.id));
  useTrackedView(
    "youtube_videos_viewed",
    { ...flow, channel_id: channel.id, product_id: selected?.id, result_count: filteredVideos.length },
    { key: `${channel.id}:${filter ?? "all"}`, enabled: tab === "videos" },
  );
  const sortedProducts =
    sort === "recent" ? [...products].sort((a, b) => b.lastMentionedAt.localeCompare(a.lastMentionedAt)) : products;
  const showVideos = (productId: number) => {
    setFilter(productId);
    setTab("videos");
    setPlaying(undefined);
  };
  const selectTab = (next: Tab) => {
    setTab(next);
    setPlaying(undefined);
  };
  return (
    <>
      <TopBar
        variant="sub"
        title={
          tab === "videos" ? (
            <span className="flex min-w-0 items-center justify-center gap-2">
              <ChannelAvatar channel={channel} small />
              <span className="truncate">{channel.name}</span>
            </span>
          ) : (
            "유튜버"
          )
        }
        back={{ asChild: <Link href="/youtubers" />, label: "유튜버 목록으로" }}
      />
      <main
        ref={mainRef}
        className={cn(
          "flex-1 scroll-mt-11 px-gutter",
          tab === "videos" && filteredVideos.length === 0 ? "pb-8" : "pb-inquiry",
        )}
      >
        {tab === "products" && (
          <>
            <ChannelBanner src={channel.bannerImageUrl} />
            <div className="flex items-center gap-4 py-6">
              <ChannelAvatar channel={channel} />
              <div className="min-w-0">
                <a
                  href={`https://www.youtube.com/channel/${encodeURIComponent(channel.id)}`}
                  onClick={() =>
                    track("youtube_external_link_clicked", { ...flow, channel_id: channel.id, target: "channel" })
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-20 font-bold"
                >
                  {channel.name}
                  <PlayIcon className="text-brand-text" />
                  <span className="sr-only">YouTube 채널 열기</span>
                </a>
                {channel.handle && <p className="mt-1 text-14 text-text-secondary">{channel.handle}</p>}
                <p className="mt-1 text-12 text-text-secondary">
                  구독자 {countLabel(channel.subscriberCount)} · 영상 {channel.videoCount}개
                </p>
              </div>
            </div>
          </>
        )}
        <div role="tablist" aria-label="유튜버 콘텐츠" className="my-4 flex rounded-full bg-surface p-1">
          {(
            [
              ["products", `제품 ${channel.productCount}`],
              ["videos", `영상 ${channel.videoCount}`],
            ] as const
          ).map(([value, label], index) => (
            <button
              key={value}
              id={`youtube-tab-${value}`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`youtube-panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => selectTab(value)}
              onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "products"
                      : event.key === "End"
                        ? "videos"
                        : index === 0
                          ? "videos"
                          : "products";
                  selectTab(next);
                  document.getElementById(`youtube-tab-${next}`)?.focus();
                }
              }}
              className={cn(
                "min-h-10 flex-1 rounded-full text-14 transition-colors focus-visible:outline-2 focus-visible:outline-action",
                tab === value ? "bg-background font-bold text-text-primary" : "text-text-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "products" ? (
          <section id="youtube-panel-products" role="tabpanel" aria-labelledby="youtube-tab-products">
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <label className="text-14 font-semibold">
                <span className="sr-only">제품 정렬</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    track("sort_applied", {
                      ...flow,
                      sort: e.target.value,
                      surface: "youtube_products",
                      channel_id: channel.id,
                    });
                  }}
                  className="min-h-11 bg-background pr-2"
                >
                  <option value="recommendations">추천 많은 순</option>
                  <option value="recent">최근 나온 순</option>
                </select>
              </label>
              <span className="text-12 text-text-secondary">{dateLabel(channel.updatedAt)} 업데이트</span>
            </div>
            <ol className="divide-y divide-border">
              {sortedProducts.map((product, index) => (
                <li key={product.id} className="flex items-center gap-3 py-5">
                  <span className="min-w-6 shrink-0 text-16 font-bold whitespace-nowrap tabular-nums">{index + 1}</span>
                  <ProductLink
                    entryPoint="youtube"
                    featureContext={{ ...flow, channel_id: channel.id }}
                    onNavigate={() =>
                      track("youtube_product_selected", { ...flow, channel_id: channel.id, product_id: product.id })
                    }
                    href={`/products/${product.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <ProductImage
                      src={product.imageUrl ?? ""}
                      size={64}
                      className="shrink-0 rounded-xl bg-surface p-2"
                    />
                    <div className="min-w-0">
                      <p className="text-12 text-text-secondary">{product.brandName}</p>
                      <h2 className="mt-1 text-14 font-semibold">{product.name}</h2>
                      <span className="mt-2 inline-flex">
                        <RecommendationBadge count={product.recommendedVideoCount} />
                      </span>
                    </div>
                  </ProductLink>
                  <button
                    type="button"
                    onClick={() => showVideos(product.id)}
                    aria-label={`${product.name} 영상 ${product.videoCount}개 보기`}
                    className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-surface px-3 text-12 font-semibold"
                  >
                    <PlayIcon />
                    영상 {product.videoCount}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section id="youtube-panel-videos" role="tabpanel" aria-labelledby="youtube-tab-videos">
            {selected && (
              <div className="flex items-center gap-2 py-2 pb-5">
                <button
                  type="button"
                  onClick={() => {
                    setFilter(undefined);
                    setPlaying(undefined);
                  }}
                  aria-label={`${selected.name} 필터 해제`}
                  className="flex min-h-11 min-w-0 items-center gap-2 rounded-full bg-action py-1 pr-3 pl-1 text-12 font-semibold text-action-text"
                >
                  <ProductImage
                    src={selected.imageUrl ?? ""}
                    size={28}
                    className="shrink-0 rounded-full bg-background"
                  />
                  <span className="truncate">{selected.name}</span>
                  <Icon name="x" className="size-4 shrink-0" />
                </button>
                <span className="shrink-0 text-12 text-text-secondary">영상 {filteredVideos.length}</span>
              </div>
            )}
            {filteredVideos.length === 0 && (
              <p className="py-12 text-center text-14 text-text-secondary">표시할 영상이 없어요.</p>
            )}
            <div className="space-y-8">
              {filteredVideos.map((video) => {
                const active = playing?.videoId === video.id;
                // Keep every source mention, but show one shared timestamp per product in this video.
                const videoProducts = [...video.mentions]
                  .sort((a, b) => a.startMs - b.startMs || a.ordinal - b.ordinal)
                  .filter(
                    (mention, index, mentions) =>
                      mentions.findIndex((other) => other.productId === mention.productId) === index,
                  );
                return (
                  <article
                    key={video.id}
                    id={`youtube-video-${video.id}`}
                    className="scroll-mt-14 border-b border-border pb-8"
                  >
                    {active ? (
                      <iframe
                        key={`${video.id}-${playing.ms}`}
                        title={video.title}
                        src={`https://www.youtube-nocookie.com/embed/${video.id}?start=${Math.floor(playing.ms / 1000)}&autoplay=1`}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full rounded-xl border-0 bg-action"
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={`${video.title} 재생`}
                        onClick={() => play(video.id, 0, { placement: "thumbnail", productId: selected?.id })}
                        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-action text-action-text"
                      >
                        {video.thumbnailUrl && (
                          <Image
                            src={video.thumbnailUrl}
                            alt=""
                            fill
                            unoptimized
                            sizes="480px"
                            className="object-cover"
                          />
                        )}
                        <span className="relative rounded-full bg-action p-3">
                          <PlayIcon className="size-6" />
                        </span>
                      </button>
                    )}
                    <div className="py-4">
                      <h2 className="text-16 font-bold">{video.title}</h2>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-12 text-text-secondary">
                          {dateLabel(video.publishedAt)} ·{" "}
                          {video.viewCount == null ? "조회수 비공개" : `조회수 ${countLabel(video.viewCount)}회`}
                        </p>
                        <a
                          href={`https://www.youtube.com/watch?v=${video.id}`}
                          onClick={() =>
                            track("youtube_external_link_clicked", {
                              ...flow,
                              channel_id: channel.id,
                              target: "video",
                              video_id: video.id,
                            })
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${video.title} YouTube에서 열기`}
                          className="flex min-h-11 shrink-0 items-center rounded-full bg-surface px-3 text-12"
                        >
                          YouTube
                          <Icon name="chevron-right" className="size-4" />
                        </a>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {videoProducts.map((mention) => {
                        const recommended =
                          mention.recommendation === "recommended" &&
                          mention.videoRecommendation === "recommended" &&
                          !video.mentions.some(
                            (other) =>
                              other.productId === mention.productId &&
                              ["mixed", "not_recommended", "uncertain"].includes(other.recommendation),
                          );
                        return (
                          <li key={mention.ordinal}>
                            <button
                              type="button"
                              onClick={() =>
                                play(video.id, mention.startMs, {
                                  placement: "mention_timestamp",
                                  productId: mention.productId,
                                })
                              }
                              aria-label={`${timestamp(mention.startMs)} ${mention.summary}`}
                              aria-pressed={active && playing.ms === mention.startMs}
                              className={cn(
                                "flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left",
                                active && playing.ms === mention.startMs ? "bg-brand-soft" : "hover:bg-surface",
                              )}
                            >
                              <time className="w-10 shrink-0 text-14 font-semibold text-brand-text tabular-nums">
                                {timestamp(mention.startMs)}
                              </time>
                              <span className="flex-1 text-14 leading-relaxed">
                                {mention.summary}
                                <span
                                  className={cn(
                                    "mt-1 block text-12",
                                    recommended ? "text-brand-text" : "text-text-secondary",
                                  )}
                                >
                                  {recommended ? "추천" : "정보성 언급"}
                                </span>
                              </span>
                              <ProductImage
                                src={mention.productImageUrl ?? ""}
                                size={28}
                                className="shrink-0 rounded-sm bg-surface"
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <h3 className="mt-6 mb-3 text-14 font-bold">이 영상에 나온 제품 {videoProducts.length}</h3>
                    <ul className="flex gap-3 overflow-x-auto pb-2">
                      {videoProducts.map((product) => (
                        <li key={product.productId} className="w-28 shrink-0">
                          <ProductLink
                            entryPoint="youtube"
                            featureContext={{ ...flow, channel_id: channel.id, video_id: video.id }}
                            onNavigate={() =>
                              track("youtube_product_selected", {
                                ...flow,
                                channel_id: channel.id,
                                video_id: video.id,
                                product_id: product.productId,
                              })
                            }
                            href={`/products/${product.productId}`}
                            aria-label={`${product.brandName} ${product.productName} 제품 상세`}
                          >
                            <ProductImage
                              src={product.productImageUrl ?? ""}
                              size={112}
                              sizes="112px"
                              className="aspect-square w-full rounded-xl bg-surface p-3"
                            />
                          </ProductLink>
                          <button
                            type="button"
                            onClick={() =>
                              play(video.id, product.startMs, {
                                placement: "product_timestamp",
                                productId: product.productId,
                              })
                            }
                            aria-label={`${product.productName} ${timestamp(product.startMs)} 재생`}
                            className="flex min-h-11 items-center gap-1 text-12 font-semibold text-brand-text"
                          >
                            <PlayIcon />
                            {timestamp(product.startMs)}
                          </button>
                          <ProductLink
                            entryPoint="youtube"
                            featureContext={{ ...flow, channel_id: channel.id, video_id: video.id }}
                            onNavigate={() =>
                              track("youtube_product_selected", {
                                ...flow,
                                channel_id: channel.id,
                                video_id: video.id,
                                product_id: product.productId,
                              })
                            }
                            href={`/products/${product.productId}`}
                          >
                            <p className="text-12 text-text-secondary">{product.brandName}</p>
                            <p className="mt-1 text-14 font-semibold">{product.productName}</p>
                          </ProductLink>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
