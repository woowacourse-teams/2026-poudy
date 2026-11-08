"use client";

import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";
import { useState } from "react";

import type { ChannelCardData } from "./ChannelCards";
import { ChannelAvatar, RecommendationBadge } from "./YouTubeUI";

import { AttributionLink as ProductLink } from "@/components/analytics/AttributionLink";
import { useTrackedView } from "@/components/analytics/useTrackedView";
import { ProductImage } from "@/components/ui/ProductImage";
import { newFeatureFlow, rememberFeatureFlow } from "@/lib/analytics/feature-flow";
import { track } from "@/lib/analytics/track";
import { countLabel, dateLabel } from "@/lib/youtube-format";

export function ChannelList({ items }: { readonly items: readonly ChannelCardData[] }) {
  const [sort, setSort] = useState("views");
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
      <div className="mt-4 flex justify-end">
        <label>
          <span className="sr-only">유튜버 정렬</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-14 font-semibold"
          >
            <option value="views">조회수 많은 순</option>
            <option value="subscribers">구독자 많은 순</option>
            <option value="updated">최신 업데이트 순</option>
            <option value="products">추천 제품 많은 순</option>
          </select>
        </label>
      </div>
      <ul className="divide-y divide-border">
        {sorted.map(({ channel, products, recommendedProductCount }) => (
          <li key={channel.id} className="py-5">
            <Link
              href={`/youtubers/${channel.id}`}
              onNavigate={() => rememberFeatureFlow("youtube", channel.id, newFeatureFlow("youtube", "channel_list"))}
              className="flex items-center gap-4"
            >
              <ChannelAvatar channel={channel} />
              <div className="min-w-0 flex-1">
                <h2 className="text-18 font-bold">{channel.name}</h2>
                <p className="mt-1 text-12 text-text-secondary">
                  {sort === "views"
                    ? `영상 조회수 ${countLabel(channel.totalViewCount)}회 · 구독자 ${countLabel(channel.subscriberCount)}`
                    : sort === "updated"
                      ? `${dateLabel(channel.updatedAt)} 업데이트 · 추천 제품 ${recommendedProductCount}개`
                      : `구독자 ${countLabel(channel.subscriberCount)} · 추천 제품 ${recommendedProductCount}개`}
                </p>
              </div>
              <Icon name="chevron-right" className="size-5 text-text-secondary" />
            </Link>
            <div className="mt-3 grid max-w-80 grid-cols-3 gap-2 pl-20">
              {products.slice(0, 3).map((product) => (
                <ProductLink
                  entryPoint="youtube"
                  featureContext={{ ...flow, channel_id: channel.id }}
                  onNavigate={() =>
                    track("youtube_product_selected", { ...flow, channel_id: channel.id, product_id: product.id })
                  }
                  key={product.id}
                  href={`/products/${product.id}`}
                  aria-label={`${product.brandName} ${product.name} 제품 상세`}
                  className="relative overflow-hidden rounded-xl bg-surface"
                >
                  <ProductImage
                    src={product.imageUrl ?? ""}
                    size={80}
                    sizes="80px"
                    className="aspect-square w-full p-2"
                  />
                  <span className="absolute top-1 left-1">
                    <RecommendationBadge count={product.recommendedVideoCount} />
                  </span>
                </ProductLink>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
