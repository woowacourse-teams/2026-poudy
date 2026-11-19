import {
  YouTubeChannelResponse,
  YouTubeProductResponse,
  YouTubeVideoResponse,
  YouTubeChannelOrderResponse,
  type YouTubeOrderRequest,
} from "@poudy/api/api.zod";
import { z } from "zod";

import { apiGet, apiPatchVoid } from "./client";

/*
 * 서버가 따로 더하는 두 필드(채널별 의견 수, 제품의 소분류)를 선택 필드로 받는다.
 * 생성 스키마(z.object)는 모르는 키를 버리므로, 생성 파일이 새 계약으로 바뀌기 전에도 값을 받으려면 여기서 넓혀야 한다.
 * 필드가 없으면 화면은 그 표시(의견 막대, 카테고리 칩)를 숨긴다. 생성 파일에 필드가 들어오면 이 확장을 지운다.
 */

/** 채널의 의견 수. 영상×제품 단위로 센다. 그 외는 추천·장단점·비추천이 아닌 나머지(정보성 언급·판단 어려움)다. */
export const OpinionCounts = z.object({
  recommended: z.number().int(),
  mixed: z.number().int(),
  notRecommended: z.number().int(),
  other: z.number().int(),
});
export type OpinionCounts = z.infer<typeof OpinionCounts>;

export const YouTubeChannel = YouTubeChannelResponse.extend({ opinionCounts: OpinionCounts.optional() });
export type YouTubeChannel = z.infer<typeof YouTubeChannel>;

/** 제품의 소분류. 유튜버 상세 제품 탭의 카테고리 칩이 쓴다. */
export const YouTubeProduct = YouTubeProductResponse.extend({
  category: z.object({ id: z.number().int(), name: z.string() }).nullable().optional(),
});
export type YouTubeProduct = z.infer<typeof YouTubeProduct>;

export type YouTubeVideo = YouTubeVideoResponse;
export type YouTubeMention = YouTubeVideo["mentions"][number];

const channelPath = (id: string) => `/api/youtube/channels/${encodeURIComponent(id)}`;
export const fetchYouTubeChannels = (offset = 0) =>
  apiGet("/api/youtube/channels", YouTubeChannel.array(), {
    revalidate: 0,
    query: new URLSearchParams({ limit: "50", offset: String(offset) }),
  });
export const fetchYouTubeChannel = (id: string) => apiGet(channelPath(id), YouTubeChannel, { revalidate: 0 });
export const fetchYouTubeProducts = (id: string) =>
  apiGet(`${channelPath(id)}/products`, YouTubeProduct.array(), { revalidate: 0 });
/** 채널의 영상. 최근에 올린 영상이 먼저 온다. */
export const fetchYouTubeVideos = (id: string, offset = 0, limit = 50) =>
  apiGet(`${channelPath(id)}/videos`, YouTubeVideoResponse.array(), {
    revalidate: 0,
    query: new URLSearchParams({ limit: String(limit), offset: String(offset) }),
  });

/** 제품을 언급한 영상. 최근 영상이 먼저 오고, 영상마다 이 제품의 언급만 담긴다. limit·offset 은 영상 단위다. */
export const fetchProductYouTubeMentions = (productId: number, offset: number, limit: number) =>
  apiGet(`/api/products/${productId}/youtube-mentions`, YouTubeVideoResponse.array(), {
    revalidate: 0,
    query: new URLSearchParams({ limit: String(limit), offset: String(offset) }),
  });

/** 홈 유튜버 섹션에 보이는 언급 수 */
export const RECENT_MENTION_COUNT = 3;

/** 최근 언급 하나와 그 언급이 나온 영상 */
export type RecentMention = { readonly videoId: string; readonly mention: YouTubeMention };

/**
 * 채널의 최근 언급 세 개. 최근 영상부터, 한 영상 안에서는 시각 순서로 잇는다. 한 영상의 언급이 셋보다 적으면 다음 영상에서 채운다.
 * 언급이 있는 영상만 오므로 영상 세 편이면 언급 셋을 채울 수 있다.
 */
export const fetchRecentMentions = async (channelId: string): Promise<readonly RecentMention[]> => {
  const videos = await fetchYouTubeVideos(channelId, 0, RECENT_MENTION_COUNT);
  return videos
    .flatMap((video) => video.mentions.map((mention) => ({ videoId: video.id, mention })))
    .slice(0, RECENT_MENTION_COUNT);
};

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
