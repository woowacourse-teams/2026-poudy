import { notFound } from "next/navigation";

import { ChannelDetail } from "@/components/youtube/ChannelDetail";
import { ApiError } from "@/lib/api/client";
import { allYouTubePages, fetchYouTubeChannel, fetchYouTubeProducts, fetchYouTubeVideos } from "@/lib/api/youtube";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ channelId: string }>;
  readonly searchParams: Promise<{ tab?: string; product?: string }>;
}) {
  const { channelId } = await params;
  const query = await searchParams;
  const [channel, products, videos] = await (async () => {
    try {
      return await Promise.all([
        fetchYouTubeChannel(channelId),
        fetchYouTubeProducts(channelId),
        allYouTubePages((offset) => fetchYouTubeVideos(channelId, offset)),
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }
  })();
  return (
    <ChannelDetail
      key={`${channelId}-${query.tab}-${query.product}`}
      initialTab={query.tab === "videos" ? "videos" : "products"}
      initialProduct={Number(query.product) || undefined}
      channel={channel}
      products={products}
      videos={videos}
    />
  );
}
