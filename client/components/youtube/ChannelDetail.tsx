"use client";

import { Icon } from "@poudy/design-system/icon";
import { Tab, TabLabel, TabList, TabPanel, Tabs } from "@poudy/design-system/tabs";
import { ToggleChip } from "@poudy/design-system/toggle-chip";
import { TopBar } from "@poudy/design-system/top-bar";
import { useDragScroll } from "@poudy/design-system/use-drag-scroll";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ChannelVideos } from "./ChannelVideos";
import { countOpinions, OpinionBar } from "./Opinion";
import type { VideoMentionLine } from "./VideoMentions";
import { VideoSheet } from "./VideoSheet";
import { ChannelAvatar } from "./YouTubeUI";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { type SubScreenFallback, useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { ProductGrid, ProductGridCard } from "@/components/product/ProductGridCard";
import { featureFlowFor } from "@/lib/analytics/feature-flow";
import { track } from "@/lib/analytics/track";
import type { YouTubeChannel, YouTubeProduct, YouTubeVideo } from "@/lib/api/youtube";
import { formatNumber } from "@/lib/domain/format";
import { usePassedTopBoundary } from "@/lib/hooks/usePassedTopBoundary";
import { countLabel } from "@/lib/youtube-format";

type Tab = "products" | "videos";
const CHANNEL_LIST: SubScreenFallback = { href: "/youtubers", label: "유튜버 목록으로" };

/** 하위 상단 내비의 높이(44). 채널 이름이 이 아래로 가려지면 바 제목을 채널 이름으로 바꾼다. */
const SUB_BAR_HEIGHT = 44;

/** 첫 줄에 바로 보이는 제품 칸 수(3열). 이 칸의 사진은 미루지 않고 받는다. */
const FIRST_ROW_COUNT = 3;

/** 재생 시트에서 보는 영상과 시작 시각. activeMs 는 누른 언급의 시각이고, 영상 머리로 열었으면 없다. */
type Playing = { readonly videoId: string; readonly startMs: number; readonly activeMs?: number };

/**
 * 주소에 남기는 화면 상태. 제품 상세에 다녀와도, 공유한 주소로 들어와도 같은 화면이 열린다.
 *
 * - tab=videos: 영상 탭. 없으면 제품 탭이다.
 * - product: 영상을 이 제품으로 거른다(S294).
 * - category: 제품 탭을 이 소분류로 거른다(S291-1).
 * - video · t: 이 영상의 재생 시트를 t초부터 연다. 제품 상세의 유튜브 섹션이 언급 시각으로 들어올 때 쓴다.
 */
type ChannelState = {
  readonly tab: Tab;
  readonly filter: number | undefined;
  readonly category: number | undefined;
  readonly playing: Playing | undefined;
};

const channelUrl = (href: string, state: ChannelState) => {
  const url = new URL(href);
  const set = (key: string, value: string | undefined) =>
    value === undefined ? url.searchParams.delete(key) : url.searchParams.set(key, value);
  set("tab", state.tab === "videos" ? "videos" : undefined);
  set("product", state.filter === undefined ? undefined : String(state.filter));
  set("category", state.category === undefined ? undefined : String(state.category));
  set("video", state.playing?.videoId);
  set("t", state.playing ? String(Math.floor((state.playing.activeMs ?? state.playing.startMs) / 1000)) : undefined);
  return url.pathname + url.search + url.hash;
};

/** 주소의 숫자 값. 없거나 숫자가 아니면 undefined 다. */
const numberParam = (value: string | null) => {
  if (value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

/** 제품 탭의 카테고리 칩. 제품 응답에 소분류가 있을 때만 만들고, 제품이 많은 칩부터 놓는다. */
const categoriesOf = (products: readonly YouTubeProduct[]) => {
  const counts = new Map<number, { readonly id: number; readonly name: string; count: number }>();
  for (const product of products) {
    if (!product.category) continue;
    const entry = counts.get(product.category.id);
    if (entry) entry.count += 1;
    else counts.set(product.category.id, { ...product.category, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
};

/**
 * 유튜버 상세(명세 S291 ~ S296). 채널 정보와 의견 막대 아래에 제품 · 영상 밑줄 탭을 둔다.
 *
 * - 제품 탭: 이 유튜버가 언급한 제품만 3열 칸(홈 제품 카드, 순위 없음). 의견 표지는 두지 않는다. 의견은 영상×제품 단위라 영상 탭에서 본다.
 * - 영상 탭: 영상별 언급 묶음. 언급을 누르면 그 시각부터 재생 시트가 열린다.
 * - 탭 줄(과 제품 탭의 카테고리 칩 줄)은 내리면 상단 내비 밑에 붙는다(S292). 채널 이름이 가려지면 바 제목이 채널 이름으로 바뀐다.
 */
export function ChannelDetail({
  channel,
  products,
  videos,
}: {
  readonly channel: YouTubeChannel;
  readonly products: readonly YouTubeProduct[];
  readonly videos: readonly YouTubeVideo[];
}) {
  const mainRef = useRef<HTMLElement>(null);
  // 메인 카드처럼 사이트 안에서 왔으면 그 화면으로 한 번에 돌아가고, 공유 링크로 바로 들어왔을 때만 목록으로 간다.
  const back = useSubScreenBack(CHANNEL_LIST);
  /*
   * 화면 상태는 주소에서 읽는다. 제품 상세에 다녀오면 라우터는 처음 받은 화면을 다시 그리므로,
   * 서버가 넘긴 값은 처음 들어온 주소의 것이다. 주소는 아래에서 고친 값이라 돌아왔을 때도 맞다.
   */
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const productId = numberParam(searchParams.get("product"));
    const video = videos.find((item) => item.id === searchParams.get("video"));
    const seconds = numberParam(searchParams.get("t"));
    const startMs = seconds === undefined ? 0 : Math.max(0, seconds) * 1000;
    return {
      tab: (searchParams.get("tab") === "videos" || video ? "videos" : "products") as Tab,
      filter: products.some((p) => p.id === productId) ? productId : undefined,
      category: numberParam(searchParams.get("category")),
      playing: video
        ? { videoId: video.id, startMs, activeMs: seconds === undefined ? undefined : startMs }
        : undefined,
    };
  });
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [filter, setFilter] = useState<number | undefined>(initial.filter);
  const [category, setCategory] = useState<number | undefined>(initial.category);
  const [playing, setPlaying] = useState<Playing | undefined>(initial.playing);
  const flow = featureFlowFor("youtube", channel.id);

  /*
   * 탭 · 거르기 · 재생 시트를 바꾸면 주소에도 남긴다. 방문 기록은 쌓지 않는다(replace, #1258).
   * `router.replace` 는 서버를 다시 다녀오므로 history API 만 쓴다.
   */
  useEffect(() => {
    const next = channelUrl(window.location.href, { tab, filter, category, playing });
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [tab, filter, category, playing]);
  /* 탭이나 거르기를 바꿀 때만 본문 맨 위로 올린다. 처음 그릴 때 올리면 돌아온 화면의 스크롤 자리를 덮는다. */
  const shown = useRef({ tab, filter });
  useEffect(() => {
    if (shown.current.tab === tab && shown.current.filter === filter) return;
    shown.current = { tab, filter };
    mainRef.current?.scrollIntoView?.({ block: "start" });
  }, [tab, filter]);

  /* 주소로 재생 시트를 열고 들어왔으면 재생 요청으로 한 번 남긴다. */
  const linked = useRef(initial.playing);
  useEffect(() => {
    const opened = linked.current;
    if (!opened) return;
    linked.current = undefined;
    track("youtube_video_play_requested", {
      ...flow,
      channel_id: channel.id,
      video_id: opened.videoId,
      start_ms: opened.startMs,
      placement: "link",
      product_id: initial.filter,
    });
  }, [channel.id, flow, initial.filter]);

  useTrackedView(
    "youtube_channel_viewed",
    {
      ...flow,
      channel_id: channel.id,
      initial_tab: initial.tab,
      product_count: products.length,
      video_count: videos.length,
    },
    { key: channel.id },
  );

  const selected = products.find((p) => p.id === filter);
  const filteredVideos = videos.filter((v) => !selected || v.mentions.some((m) => m.productId === selected.id));
  const categories = categoriesOf(products);
  const shownCategory = categories.some((c) => c.id === category) ? category : undefined;
  const shownProducts =
    shownCategory === undefined ? products : products.filter((p) => p.category?.id === shownCategory);
  const productCount =
    tab === "products"
      ? shownProducts.length
      : new Set(filteredVideos.flatMap((video) => video.mentions.map((mention) => mention.productId))).size;
  useTrackedView(
    "youtube_products_viewed",
    { ...flow, channel_id: channel.id, result_count: productCount },
    {
      key: `${channel.id}:${tab}:${filter ?? "all"}:${shownCategory ?? "all"}`,
      enabled: tab === "products" || productCount > 0,
    },
  );
  useTrackedView(
    "youtube_videos_viewed",
    { ...flow, channel_id: channel.id, product_id: selected?.id, result_count: filteredVideos.length },
    { key: `${channel.id}:${filter ?? "all"}`, enabled: tab === "videos" },
  );

  const play = (video: YouTubeVideo, line: VideoMentionLine | undefined) => {
    const startMs = line?.mention.startMs ?? 0;
    track("youtube_video_play_requested", {
      ...flow,
      channel_id: channel.id,
      video_id: video.id,
      start_ms: startMs,
      placement: line ? "mention_timestamp" : "thumbnail",
      product_id: line?.mention.productId ?? selected?.id,
    });
    setPlaying({ videoId: video.id, startMs, activeMs: line?.mention.startMs });
  };
  const productSelected = (productId: number, videoId?: string) =>
    track("youtube_product_selected", { ...flow, channel_id: channel.id, video_id: videoId, product_id: productId });
  const selectTab = (next: Tab) => {
    setTab(next);
    setPlaying(undefined);
  };
  const playingVideo = videos.find((video) => video.id === playing?.videoId);
  const opinions = countOpinions(videos);
  const { ref: nameEndRef, passed } = usePassedTopBoundary<HTMLSpanElement>({ enterAt: SUB_BAR_HEIGHT });

  return (
    <>
      <TopBar variant="sub" title={<BarTitle name={channel.name} passed={passed} />} back={back} />
      <main ref={mainRef} className="flex flex-1 scroll-mt-11 flex-col pb-inquiry">
        <div className="flex flex-col px-gutter">
          <div className="flex items-center gap-4 pt-4 pb-3">
            <ChannelAvatar channel={channel} size={64} />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="relative text-screen font-bold text-text-primary">
                <a
                  href={`https://www.youtube.com/channel/${encodeURIComponent(channel.id)}`}
                  onClick={() =>
                    track("youtube_external_link_clicked", { ...flow, channel_id: channel.id, target: "channel" })
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  {channel.name}
                  <Icon name="brand-youtube" size={16} className="shrink-0 text-brand-text" />
                  <span className="sr-only">YouTube 채널 열기</span>
                </a>
                {/* 채널 이름의 아래 끝. 이 표식이 상단 내비 아래로 지나가면 바 제목을 채널 이름으로 바꾼다(S292). */}
                <span ref={nameEndRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" />
              </h2>
              <p className="text-caption text-text-secondary">
                구독자 {countLabel(channel.subscriberCount)} · 영상 {formatNumber(channel.videoCount)}개
              </p>
            </div>
          </div>
          <OpinionBar variant="detail" counts={opinions} />
        </div>

        <Tabs value={tab} onValueChange={(value) => selectTab(value === "videos" ? "videos" : "products")} slide>
          {/* 탭 줄과 카테고리 칩 줄은 내리면 상단 내비(44) 밑에 붙는다(S292). 본문에 좌우 여백이 없어 흰 면이 화면 끝까지 덮는다. */}
          <div className="sticky top-11 z-(--z-sticky) flex flex-col bg-background">
            <div className="px-gutter pt-4">
              <TabList label="유튜버 콘텐츠">
                <Tab value="products">
                  <TabLabel>
                    <span className="text-title">제품 {formatNumber(channel.productCount)}</span>
                  </TabLabel>
                </Tab>
                <Tab value="videos">
                  <TabLabel>
                    <span className="text-title">영상 {formatNumber(channel.videoCount)}</span>
                  </TabLabel>
                </Tab>
              </TabList>
            </div>
            {tab === "products" && categories.length > 0 ? (
              <CategoryChips
                total={products.length}
                categories={categories}
                selected={shownCategory}
                onSelect={setCategory}
              />
            ) : (
              <div className="h-4" />
            )}
          </div>

          <TabPanel value="products">
            <div className="px-gutter pt-2">
              <ProductGrid>
                {shownProducts.map((product, index) => (
                  <li key={product.id}>
                    <ProductGridCard
                      id={product.id}
                      name={product.name}
                      brandName={product.brandName}
                      imageUrl={product.imageUrl ?? ""}
                      from="youtube"
                      featureContext={{ ...flow, channel_id: channel.id }}
                      loading={index < FIRST_ROW_COUNT ? "eager" : "lazy"}
                      onClick={() => productSelected(product.id)}
                    />
                  </li>
                ))}
              </ProductGrid>
            </div>
          </TabPanel>
          <TabPanel value="videos">
            <div className="px-gutter">
              <ChannelVideos
                videos={filteredVideos}
                selected={selected}
                totalCount={videos.length}
                featureContext={{ ...flow, channel_id: channel.id }}
                onOpenVideo={(video) => play(video, undefined)}
                onPlayMention={play}
                onProductNavigate={productSelected}
                onClearFilter={() => {
                  setFilter(undefined);
                  setPlaying(undefined);
                }}
              />
            </div>
          </TabPanel>
        </Tabs>
      </main>

      <VideoSheet
        video={playingVideo}
        startMs={playing?.startMs ?? 0}
        activeMs={playing?.activeMs}
        onPlay={(line) => playingVideo && play(playingVideo, line)}
        onExternalLink={(video) =>
          track("youtube_external_link_clicked", {
            ...flow,
            channel_id: channel.id,
            target: "video",
            video_id: video.id,
          })
        }
        onClose={() => setPlaying(undefined)}
      />
    </>
  );
}

/**
 * 바 제목. 맨 위에서는 '유튜버'이고, 채널 이름이 가려지면 채널 이름으로 바뀐다(S292, 로고 없이 이름만).
 * 두 제목을 한 칸에 겹쳐 두고 불투명도만 바꾼다. 보이지 않는 쪽은 낭독에서 감춘다(브랜드 상세 바 제목과 같은 방식).
 */
function BarTitle({ name, passed }: { readonly name: string; readonly passed: boolean }) {
  const layer = "col-start-1 row-start-1 transition-opacity duration-(--duration-fast) ease-out";
  return (
    <span className="grid min-w-0 items-center justify-items-center">
      <span aria-hidden={passed} className={`${layer} ${passed ? "opacity-0" : ""}`}>
        유튜버
      </span>
      <span aria-hidden={!passed} className={`${layer} max-w-full min-w-0 truncate ${passed ? "" : "opacity-0"}`}>
        {name}
      </span>
    </span>
  );
}

/** 제품 탭의 카테고리 칩 줄(S291-1). 가로로 밀고, 마우스로 끌어서도 민다. 칩은 소분류 그대로이고 하나만 고른다. */
function CategoryChips({
  total,
  categories,
  selected,
  onSelect,
}: {
  readonly total: number;
  readonly categories: readonly { readonly id: number; readonly name: string; readonly count: number }[];
  readonly selected: number | undefined;
  readonly onSelect: (category: number | undefined) => void;
}) {
  const dragScroll = useDragScroll();
  return (
    <div
      {...dragScroll}
      role="group"
      aria-label="카테고리"
      className="scrollbar-none flex gap-2 overflow-x-auto scroll-px-gutter px-gutter pt-5 pb-1"
    >
      <ToggleChip size="sm" pressed={selected === undefined} onPressedChange={() => onSelect(undefined)}>
        전체 {formatNumber(total)}
      </ToggleChip>
      {categories.map((category) => (
        <ToggleChip
          key={category.id}
          size="sm"
          pressed={selected === category.id}
          onPressedChange={() => onSelect(category.id)}
        >
          {category.name} {formatNumber(category.count)}
        </ToggleChip>
      ))}
    </div>
  );
}
