import {
  YouTubeChannelResponse,
  YouTubeProductResponse,
  YouTubeVideoResponse,
  YouTubeChannelOrderResponse,
  type YouTubeOrderRequest,
} from "@poudy/api/api.zod";

import { apiGet, apiPatchVoid } from "./client";

const channelPath = (id: string) => `/api/youtube/channels/${encodeURIComponent(id)}`;
export const fetchYouTubeChannels = (offset = 0) =>
  apiGet("/api/youtube/channels", YouTubeChannelResponse.array(), {
    revalidate: 0,
    query: new URLSearchParams({ limit: "50", offset: String(offset) }),
  });
export const fetchYouTubeChannel = (id: string) => apiGet(channelPath(id), YouTubeChannelResponse, { revalidate: 0 });
export const fetchYouTubeProducts = (id: string) =>
  apiGet(`${channelPath(id)}/products`, YouTubeProductResponse.array(), { revalidate: 0 });
export const fetchYouTubeVideos = (id: string, offset = 0) =>
  apiGet(`${channelPath(id)}/videos`, YouTubeVideoResponse.array(), {
    revalidate: 0,
    query: new URLSearchParams({ limit: "50", offset: String(offset) }),
  });

// 시범 데이터는 작지만, 50개를 넘겨도 뒤쪽 영상/채널이 조용히 누락되지 않게 한다.
export async function allYouTubePages<T>(load: (offset: number) => Promise<readonly T[]>): Promise<T[]> {
  const items: T[] = [];
  for (;;) {
    const page = await load(items.length);
    items.push(...page);
    if (page.length < 50) return items;
  }
}

export const fetchYouTubeChannelCards = async () => {
  const channels = await allYouTubePages(fetchYouTubeChannels);
  return Promise.all(channels.map(async (channel) => ({ channel, products: await fetchYouTubeProducts(channel.id) })));
};

export const fetchYouTubeOrder = () =>
  apiGet("/api/admin/youtube/channels", YouTubeChannelOrderResponse.array(), { withSession: true });
export const saveYouTubeOrder = (id: string, request: YouTubeOrderRequest) =>
  apiPatchVoid(`/api/admin/youtube/channels/${encodeURIComponent(id)}/order`, request);
