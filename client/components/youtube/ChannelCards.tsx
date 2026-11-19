"use client";

import { cn } from "@poudy/design-system/cn";
import { EmptyState } from "@poudy/design-system/empty-state";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { Skeleton, SkeletonSlowNotice } from "@poudy/design-system/skeleton";
import { useDelayedFlag } from "@poudy/design-system/use-delayed-flag";
import { useDragScroll } from "@poudy/design-system/use-drag-scroll";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useRef, useState } from "react";

import { OpinionTag } from "./Opinion";
import { ChannelAvatar } from "./YouTubeUI";

import { SectionBand } from "@/components/home/SectionBand";
import { ProductImage } from "@/components/ui/ProductImage";
import { newFeatureFlow, rememberFeatureFlow } from "@/lib/analytics/feature-flow";
import { track } from "@/lib/analytics/track";
import { fetchRecentMentions, type RecentMention, type YouTubeChannel } from "@/lib/api/youtube";
import { useHomeSectionView } from "@/lib/hooks/useHomeSectionView";

const TITLE_ID = "youtube-heading";

/** 첫 로딩 스켈레톤의 프로필 수. 390 폭의 줄에 다섯째가 반쯤 걸린다(S288-1). */
const SKELETON_CHANNEL_COUNT = 5;

/** 채널마다 받은 최근 언급. 받는 중이면 "loading", 실패했으면 "error" 다. */
type Loaded = Readonly<Record<string, readonly RecentMention[] | "loading" | "error">>;

type YouTubeHomeSectionProps = {
  /** 줄에 세울 유튜버. 관리자가 정한 순서이고, 최근 언급이 없는 채널은 이미 뺐다. 비어 있으면 섹션을 그리지 않는다. */
  readonly channels: readonly YouTubeChannel[];
  /** 서버가 미리 받은 첫 유튜버의 최근 언급. 받지 못했으면 null 이고 섹션 오류를 보인다. */
  readonly initialMentions: readonly RecentMention[] | null;
};

/**
 * 홈 유튜버 섹션 '평소 보는 유튜버가 있나요?'(명세 S288 계열).
 *
 * 위에 유튜버 프로필 줄을 두어 하나를 고르게 하고, 아래에 고른 사람의 최근 언급 3개를 의견 태그 · 요약 · 제품으로 보여 준다.
 * 첫 유튜버는 서버가 받아 오고, 다른 유튜버를 고르면 그 사람의 언급을 그 자리에서 받는다. 한 번 받은 언급은 기억한다(S288-2).
 * 칩을 빠르게 옮기면 늦게 온 응답이 지금 고른 사람의 자리를 덮지 않도록, 결과를 채널별 자리에 담는다(사람들이 보는 제품과 같은 방식).
 */
export function YouTubeHomeSection({ channels, initialMentions }: YouTubeHomeSectionProps) {
  const sectionRef = useHomeSectionView("youtube", 5);
  const dragScroll = useDragScroll();
  const first = channels[0]?.id ?? "";
  const [selected, setSelected] = useState(first);
  /* 바로 앞에 고른 유튜버. 새 응답을 기다리는 짧은 동안에는 그 목록을 그대로 둔다. */
  const [previous, setPrevious] = useState(first);
  const [loaded, setLoaded] = useState<Loaded>(() => ({ [first]: initialMentions ?? "error" }));
  /* 같은 유튜버를 다시 시도할 때 앞서 보낸 요청의 응답은 버린다. */
  const requests = useRef(new Map<string, number>());

  const state = loaded[selected];
  /* 스켈레톤은 늦게 켜고, 켜면 잠깐 유지한다(FEEDBACK F02). 켜기 전에는 앞 유튜버의 목록을 그대로 둔다. */
  const showSkeleton = useDelayedFlag(state === "loading");
  const before = loaded[previous];
  const keepsBefore = !showSkeleton && state === "loading" && Array.isArray(before);
  const shown = showSkeleton ? "loading" : keepsBefore ? before : state;
  const shownChannel = keepsBefore ? previous : selected;

  if (channels.length === 0) return null;

  const load = (channelId: string) => {
    const id = (requests.current.get(channelId) ?? 0) + 1;
    requests.current.set(channelId, id);
    setLoaded((current) => ({ ...current, [channelId]: "loading" }));
    fetchRecentMentions(channelId)
      .catch((): "error" => "error")
      .then((result) => {
        if (requests.current.get(channelId) !== id) return;
        setLoaded((current) => ({ ...current, [channelId]: result }));
      });
  };

  const select = (channelId: string, position: number) => {
    if (channelId === selected) return;
    setPrevious(selected);
    setSelected(channelId);
    track("home_youtuber_selected", { channel_id: channelId, position });
    if (loaded[channelId] === undefined || loaded[channelId] === "error") load(channelId);
  };

  // 아래 띠는 섹션과 함께 그린다. 섹션이 없으면 위아래 띠가 맞붙지 않게 함께 사라진다.
  return (
    <>
      <section ref={sectionRef} aria-labelledby={TITLE_ID} className="flex flex-col gap-4 px-gutter">
        <SectionHead />
        {/* 줄은 거터 안에서 자르고(S288), 스크롤바를 숨겼으므로 마우스로 끌어서도 민다. */}
        <div
          {...dragScroll}
          role="group"
          aria-label="유튜버 고르기"
          className="scrollbar-none flex gap-4 overflow-x-auto"
        >
          {channels.map((channel, index) => (
            <ChannelChoice
              key={channel.id}
              channel={channel}
              selected={channel.id === selected}
              onSelect={() => select(channel.id, index + 1)}
            />
          ))}
        </div>
        <div aria-busy={state === "loading"}>
          {shown === "loading" ? (
            <>
              {/* 10초가 넘으면 스켈레톤 위에 안내와 [다시 시도]를 보인다(S288-3). 유튜버를 바꾸면 처음부터 잰다. */}
              <SkeletonSlowNotice key={selected} active={state === "loading"} onRetry={() => load(selected)} />
              <MentionsSkeleton />
            </>
          ) : shown === "error" ? (
            <ErrorState variant="section" onRetry={() => load(selected)}>
              유튜버의 언급을 불러오지 못했어요
            </ErrorState>
          ) : shown.length === 0 ? (
            <EmptyState title="아직 정리한 언급이 없어요" />
          ) : (
            <ul className="flex flex-col">
              {shown.map((item) => (
                <li key={`${item.videoId}-${item.mention.ordinal}`} className="border-b border-border last:border-b-0">
                  <MentionRow channelId={shownChannel} item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <SectionBand />
    </>
  );
}

/** 섹션 머리. 제목과 '전체 ›'(유튜버 목록). 첫 로딩 스켈레톤도 머리는 실제로 그린다(S288-1). */
function SectionHead() {
  const { pressableProps } = usePressable();
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={TITLE_ID} className="text-section font-bold text-text-primary">
        평소 보는 유튜버가 있나요?
      </h2>
      <Link
        href="/youtubers"
        aria-label="유튜버 전체 보기"
        {...pressableProps}
        className="pressable press-scale fb-inline fb-inline-on-background flex min-h-11 shrink-0 items-center gap-0.5 text-body-sm font-semibold text-text-secondary select-none"
      >
        전체
        <Icon name="chevron-right" size={16} />
      </Link>
    </div>
  );
}

/** 유튜버 한 칸(폭 68). 고른 사람은 사진 둘레 2 의 진한 테두리와 굵은 이름, 나머지는 보통 굵기 회색 이름이다. */
function ChannelChoice({
  channel,
  selected,
  onSelect,
}: {
  readonly channel: YouTubeChannel;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { pressableProps } = usePressable();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      {...pressableProps}
      className="pressable flex w-17 shrink-0 flex-col items-center gap-1 rounded-sm select-none"
    >
      <span className="relative">
        <ChannelAvatar channel={channel} size={56} />
        {/* 사진 위 덮개(fb-overlay)와 고른 표시. 둘 다 사진 위에 얹어 사진 크기와 자리를 바꾸지 않는다. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full transition-colors in-data-hovered:bg-hover-overlay in-data-pressed:bg-hover-overlay"
        />
        {selected ? (
          <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-text-primary" />
        ) : null}
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-caption",
          selected ? "font-bold text-text-primary" : "font-medium text-text-secondary",
        )}
      >
        {channel.name}
      </span>
    </button>
  );
}

/** 언급 한 행. 누르면 그 유튜버 상세의 영상 탭을 이 제품으로 거른 화면(S294)으로 간다. hover 면은 화면 폭 끝까지 깐다(S04). */
function MentionRow({ channelId, item }: { readonly channelId: string; readonly item: RecentMention }) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  const { mention } = item;
  return (
    <Link
      href={`/youtubers/${channelId}?tab=videos&product=${mention.productId}`}
      onNavigate={() => rememberFeatureFlow("youtube", channelId, newFeatureFlow("youtube", "home"))}
      {...pressableProps}
      className="pressable fb-bleed flex items-center gap-3 py-3 select-none"
    >
      <ProductImage src={mention.productImageUrl ?? ""} size={48} className="shrink-0 rounded-md bg-surface p-1.5" />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <OpinionTag recommendation={mention.recommendation} />
        <span className="text-body font-semibold text-text-primary">{mention.summary}</span>
        <span className="w-full truncate text-caption text-text-secondary">
          {mention.brandName} · {mention.productName}
        </span>
      </span>
    </Link>
  );
}

/** 언급 행 셋의 자리. 사진 칸 48 · 태그 자리 · 요약 줄 · 제품 줄이다(S288-1·2). */
function MentionsSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
          <Skeleton shape="box" className="size-12 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton shape="line" size={12} className="w-10" />
            <Skeleton shape="line" size={14} className="w-4/5" />
            <Skeleton shape="line" size={12} className="w-3/5" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 홈 유튜버 섹션의 첫 로딩(S288-1). 제목과 '전체 ›'는 실제로 그리고, 원 56 다섯 개와 이름 줄, 언급 행 셋을 스켈레톤으로 둔다.
 * 아래 회색 띠도 함께 그려, 내용이 들어올 때 아래 섹션이 밀리지 않게 한다.
 */
export function YouTubeHomeSectionSkeleton() {
  return (
    <>
      <section aria-labelledby={TITLE_ID} aria-busy="true" className="flex flex-col gap-4 px-gutter">
        <SectionHead />
        <div aria-hidden="true" className="flex gap-4 overflow-hidden">
          {Array.from({ length: SKELETON_CHANNEL_COUNT }, (_, index) => (
            <span key={index} className="flex w-17 shrink-0 flex-col items-center gap-1">
              <Skeleton shape="circle" className="size-14" />
              <Skeleton shape="line" size={12} className="w-12" />
            </span>
          ))}
        </div>
        <MentionsSkeleton />
      </section>
      <SectionBand />
    </>
  );
}
