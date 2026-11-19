import { notFound } from "next/navigation";

import { ChannelDetail } from "@/components/youtube/ChannelDetail";
import { ApiError } from "@/lib/api/client";
import { allYouTubePages, fetchYouTubeChannel, fetchYouTubeProducts, fetchYouTubeVideos } from "@/lib/api/youtube";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ channelId: string }>;
  readonly searchParams: Promise<{ tab?: string; product?: string; video?: string; t?: string }>;
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
  // 탭 · 거르기 · 재생할 영상은 ChannelDetail 이 주소에서 읽는다. 다른 상태의 주소로 옮겨 오면 새로 그린다.
  return (
    <ChannelDetail
      key={`${channelId}-${query.tab}-${query.product}-${query.video}-${query.t}`}
      channel={channel}
      products={products}
      videos={videos}
    />
  );
}
