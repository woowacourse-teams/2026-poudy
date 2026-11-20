"use client";

import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { type CSSProperties, useState } from "react";

import { OpinionBar } from "./Opinion";
import { ChannelAvatar } from "./YouTubeUI";

import { useTrackedView } from "@/components/analytics/useTrackedView";
import { SortDropdown, type SortOption } from "@/components/ui/SortDropdown";
import { newFeatureFlow, rememberFeatureFlow } from "@/lib/analytics/feature-flow";
import type { YouTubeChannel, YouTubeProduct } from "@/lib/api/youtube";
import { formatNumber } from "@/lib/domain/format";
import { countLabel, keepWords } from "@/lib/youtube-format";

export type ChannelListItem = {
  readonly channel: YouTubeChannel;
  /** '추천 제품 많은 순' 정렬의 근거. 행에는 그리지 않는다. */
  readonly products: readonly YouTubeProduct[];
};

type ChannelSort = "views" | "subscribers" | "updated" | "products";

/** 정렬 네 가지(명세 S289-1). 기본은 조회수 많은 순이다. */
const SORT_OPTIONS: readonly SortOption<ChannelSort>[] = [
  { value: "views", label: "조회수 많은 순" },
  { value: "subscribers", label: "구독자 많은 순" },
  { value: "updated", label: "최신 업데이트 순" },
  { value: "products", label: "추천 제품 많은 순" },
];

/**
 * 유튜버 목록(명세 S289). 위에 '총 N명'과 정렬, 아래에 채널 한 줄 행.
 * 행 = 프로필 48 · 이름(두 줄까지) · '구독자 N · 조회수 N', 오른쪽에 폭 132 의 의견 막대와 수. 행 전체가 상세 링크다.
 * 의견 수는 채널 응답에 있을 때만 그린다(서버 필드). 없으면 오른쪽 칸 없이 이름 줄이 폭을 채운다.
 */
export function ChannelList({ items }: { readonly items: readonly ChannelListItem[] }) {
  const [sort, setSort] = useState<ChannelSort>("views");
  const [flow] = useState(() => newFeatureFlow("youtube", "channel_list"));
  useTrackedView("youtube_list_viewed", { ...flow, channel_count: items.length }, { key: flow.feature_flow_id });
  const ranked = items.map((item) => ({
    ...item,
    recommendedProductCount: item.products.filter((p) => p.recommendedVideoCount > 0).length,
  }));
  const score = (item: (typeof ranked)[number]) => {
    switch (sort) {
      case "subscribers":
        return item.channel.subscriberCount ?? -1;
      case "updated":
        return Date.parse(item.channel.updatedAt);
      case "products":
        return item.recommendedProductCount;
      default:
        return item.channel.totalViewCount;
    }
  };
  const sorted = ranked.sort(
    (a, b) =>
      score(b) - score(a) ||
      a.channel.name.localeCompare(b.channel.name, "ko") ||
      a.channel.id.localeCompare(b.channel.id),
  );
  return (
    <>
      {/* 목록 결과 헤더(gv4R9)와 같은 줄. 제품이 아니라 사람을 세므로 단위는 '명'이다. */}
      <div className="flex items-center justify-between gap-2 pt-4">
        <p className="flex min-h-10 items-center text-body-sm font-semibold text-text-secondary">
          총 {formatNumber(items.length)}명
        </p>
        <SortDropdown value={sort} onChange={setSort} options={SORT_OPTIONS} />
      </div>
      <ul className="flex flex-col">
        {sorted.map(({ channel }) => (
          <li key={channel.id} className="border-b border-border">
            <ChannelRow channel={channel} />
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * 이름 칸이 이보다 좁아지면 의견 칸을 다음 줄로 내린다. 글자를 따라 커지는 ch 로 잡아, 기본 배율에서는 320 폭에서도 한 줄이고,
 * 기기 글자 크기를 키우면 이름의 낱말이 칸보다 길어 갈라지기 전에 의견 칸이 내려간다.
 */
const NAME_MIN_WIDTH = "8ch";

function ChannelRow({ channel }: { readonly channel: YouTubeChannel }) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <Link
      href={`/youtubers/${channel.id}`}
      onNavigate={() => rememberFeatureFlow("youtube", channel.id, newFeatureFlow("youtube", "channel_list"))}
      {...pressableProps}
      className="pressable fb-bleed flex flex-wrap items-center gap-x-3 gap-y-2 py-4 select-none"
    >
      <ChannelAvatar channel={channel} size={48} />
      <span
        style={{ "--name-min": NAME_MIN_WIDTH } as CSSProperties}
        // ch 를 이름 글자(14)로 풀도록 글자 크기를 이 칸에 둔다.
        className="flex min-w-0 flex-1 basis-(--name-min) flex-col gap-0.5 text-body"
      >
        <h2 className="line-clamp-2 text-body leading-snug font-bold text-text-primary">{keepWords(channel.name)}</h2>
        <span className="text-caption text-text-secondary">
          구독자 {countLabel(channel.subscriberCount)} · 조회수 {countLabel(channel.totalViewCount)}
        </span>
      </span>
      {channel.opinionCounts ? <OpinionBar variant="list" counts={channel.opinionCounts} className="shrink-0" /> : null}
    </Link>
  );
}
