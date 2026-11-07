import type { YouTubeChannelResponse, YouTubeProductResponse } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import Link from "next/link";

import { ChannelAvatar, ChannelBanner, RecommendationBadge } from "./YouTubeUI";

import { SectionBand } from "@/components/home/SectionBand";
import { ProductImage } from "@/components/ui/ProductImage";
import { countLabel } from "@/lib/youtube-format";

export type ChannelCardData = {
  readonly channel: YouTubeChannelResponse;
  readonly products: readonly YouTubeProductResponse[];
};

export function YouTubeHomeSection({ items }: { readonly items: readonly ChannelCardData[] }) {
  const recommendedChannels = items.filter(({ products }) => products.some((p) => p.recommendedVideoCount > 0));
  if (!recommendedChannels.length) return null;
  // 아래 띠는 섹션과 함께 그린다. 추천 채널이 없으면 위아래 띠가 맞붙지 않게 함께 사라진다.
  return (
    <>
      <section aria-labelledby="youtube-heading" className="space-y-4 px-gutter">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="youtube-heading" className="text-18 font-bold">
              유튜버가 자주 쓰는 제품
            </h2>
            <p className="mt-1 text-14 text-text-secondary">유튜버가 영상에서 추천한 제품이에요</p>
          </div>
          <Link href="/youtubers" className="flex min-h-11 shrink-0 items-center gap-1 text-14 text-text-secondary">
            전체 <Icon name="chevron-right" className="size-4" />
          </Link>
        </div>
        <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {recommendedChannels.map(({ channel, products }) => (
            <article
              key={channel.id}
              className="w-80 max-w-full shrink-0 snap-start overflow-hidden rounded-xl border border-border"
            >
              <Link
                href={`/youtubers/${channel.id}`}
                className="relative isolate flex items-center gap-3 bg-brand-soft p-5"
              >
                <ChannelBanner src={channel.bannerImageUrl} backdrop />
                <span className="relative">
                  <ChannelAvatar channel={channel} />
                </span>
                <div className="relative min-w-0">
                  <h3 className="truncate text-18 font-bold">{channel.name}</h3>
                  <p className="mt-1 text-12 text-text-primary">
                    구독자 {countLabel(channel.subscriberCount)} · 영상 {channel.videoCount}개
                  </p>
                </div>
              </Link>
              <ul className="space-y-4 p-4">
                {products
                  .filter((p) => p.recommendedVideoCount > 0)
                  .slice(0, 3)
                  .map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/youtubers/${channel.id}?tab=videos&product=${product.id}`}
                        className="flex items-center gap-3"
                      >
                        <ProductImage src={product.imageUrl ?? ""} size={48} className="rounded-lg bg-surface p-1" />
                        <div className="min-w-0 flex-1">
                          <p className="text-12 text-text-secondary">{product.brandName}</p>
                          <p className="line-clamp-2 text-14 font-semibold">{product.name}</p>
                        </div>
                        <RecommendationBadge count={product.recommendedVideoCount} />
                      </Link>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <SectionBand />
    </>
  );
}
