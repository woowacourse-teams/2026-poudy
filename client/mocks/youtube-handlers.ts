import type { YouTubeMentionResponse, YouTubeVideoResponse } from "@poudy/api/api.zod";
import { http, HttpResponse } from "msw";

import { allProducts, categories, productCategoryIds } from "./fixtures";

import type { OpinionCounts, YouTubeChannel, YouTubeProduct } from "@/lib/api/youtube";

/*
 * 유튜버 화면의 목 API. 채널 이름은 운영에 실제로 있는 채널이지만 영상 · 발언 · 수치는 지어낸 값이다.
 * 제품은 목 제품(1~15)을 써서 제품 상세로 이어진다. 서버가 따로 더하는 두 필드(채널의 opinionCounts, 제품의 category)도 넣는다.
 */

type MentionSeed = readonly [productId: number, startSeconds: number, recommendation: string, summary: string];
type VideoSeed = {
  readonly id: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly durationMinutes: number;
  readonly mentions: readonly MentionSeed[];
};
type ChannelSeed = {
  readonly id: string;
  readonly name: string;
  readonly handle: string | null;
  readonly subscriberCount: number | null;
  readonly updatedAt: string;
  readonly videos: readonly VideoSeed[];
};

const CHANNELS: readonly ChannelSeed[] = [
  {
    id: "UCmockDrBlanc0000000000",
    name: "닥터블랑 김현준",
    handle: "@닥터블랑_drblanc",
    subscriberCount: 202000,
    updatedAt: "2026-11-16T15:00:00+09:00",
    videos: [
      {
        id: "mockBlanc01",
        title: "“이게 스킨케어템 최고의 조합입니다” l 피부타입별 토너 · 세럼 · 크림 고르는 법",
        publishedAt: "2026-11-02T18:00:00+09:00",
        durationMinutes: 18,
        mentions: [
          [1, 59, "recommended", "여름 건성 토너, 세럼·크림 병행"],
          [5, 312, "mixed", "보습은 좋지만 민감한 날엔 따가움"],
          [12, 540, "not_recommended", "눈가가 따가워 민감 피부엔 비추천"],
        ],
      },
      {
        id: "mockBlanc02",
        title: "피부과 의사가 매일 쓰는 진정 크림 3가지",
        publishedAt: "2026-10-12T18:00:00+09:00",
        durationMinutes: 12,
        mentions: [
          [6, 95, "recommended", "붉은기 진정이 필요할 때 추천"],
          [13, 410, "neutral", "예전에 잘 썼던 밤으로 회고"],
        ],
      },
    ],
  },
  {
    id: "UCmockInssi000000000000",
    name: "뷰드름 유튜버 인씨",
    handle: "@beautyacne_inssi",
    subscriberCount: 568000,
    updatedAt: "2026-11-10T15:00:00+09:00",
    videos: [
      {
        id: "mockInssi01",
        title: "저는 이걸로 갈아탔어요...여름→가을 환승템 7가지",
        publishedAt: "2026-10-27T18:00:00+09:00",
        durationMinutes: 20,
        mentions: [
          [10, 61, "mixed", "여름 진정은 좋지만 환절기 보습은 부족"],
          [12, 455, "recommended", "산뜻한 크림을 찾는 지성 피부에 추천"],
          [9, 777, "recommended", "세안 뒤 촉촉한 사용감으로 추천"],
          [12, 900, "recommended", "다시 한 번 바르는 법을 보여 줌"],
        ],
      },
      {
        id: "mockInssi02",
        title: "다이소 신상? 굳이 다 살 필요 없잖아. 54종 엄격 리뷰",
        publishedAt: "2026-10-23T18:00:00+09:00",
        durationMinutes: 75,
        mentions: [
          [2, 2789, "not_recommended", "흡수가 더뎌 매일 쓰기에는 불편"],
          [7, 2877, "mixed", "흔적에는 추천, 진행 중 여드름엔 부담"],
          [5, 2986, "not_recommended", "끈끈하고 무거워 본인 피부엔 비추천"],
          [1, 3730, "recommended", "자극 없이 닦아 내기 좋은 토너"],
        ],
      },
      {
        id: "mockInssi03",
        title: "현실적으로 극지성 유분 줄이는법",
        publishedAt: "2026-10-02T18:00:00+09:00",
        durationMinutes: 9,
        mentions: [[3, 216, "recommended", "지성, 크림에 몇 방울 섞어 추천"]],
      },
    ],
  },
  {
    id: "UCmockChoijong000000000",
    name: "최종시안",
    handle: null,
    subscriberCount: 81000,
    updatedAt: "2026-11-01T15:00:00+09:00",
    videos: [
      {
        id: "mockChoi001",
        title: "광고🚫피부 좋아졌단 소리 매일 듣는 비결! 여드름 탈출 루틴",
        publishedAt: "2026-10-30T18:00:00+09:00",
        durationMinutes: 15,
        mentions: [
          [1, 633, "neutral", "예전에 잘 썼던 토너로 회고"],
          [11, 701, "recommended", "백탁 없이 가벼운 선크림"],
        ],
      },
    ],
  },
  {
    id: "UCmockJamti00000000000",
    name: "잠티",
    handle: null,
    subscriberCount: 154000,
    updatedAt: "2026-10-20T15:00:00+09:00",
    videos: [
      {
        id: "mockJamti01",
        title: "여드름 피부 토너 솔직 리뷰 l 올리브영 베스트 6종 비교",
        publishedAt: "2026-09-02T18:00:00+09:00",
        durationMinutes: 14,
        mentions: [
          [1, 252, "not_recommended", "미끄럽고 답답해 지성 피부엔 비추천"],
          [4, 380, "uncertain", "써 본 기간이 짧아 판단을 미룸"],
        ],
      },
      {
        id: "mockJamti02",
        title: "남자 기초 루틴 이렇게만 하세요 l 토너부터 선크림까지",
        publishedAt: "2026-07-21T18:00:00+09:00",
        durationMinutes: 11,
        mentions: [[1, 167, "mixed", "자극은 적지만 끈적이는 사용감"]],
      },
    ],
  },
  {
    id: "UCmockPibutenten0000000",
    name: "피부텐텐 · 피부가 예뻐지는 10분",
    handle: "@pibutenten",
    subscriberCount: 324000,
    updatedAt: "2026-10-15T15:00:00+09:00",
    videos: [
      {
        id: "mockTenten1",
        title: "민감 피부가 토너를 고를 때 꼭 보는 성분",
        publishedAt: "2026-06-11T18:00:00+09:00",
        durationMinutes: 10,
        mentions: [
          [1, 120, "recommended", "향료가 없어 민감한 날에도 무난"],
          [14, 300, "recommended", "건조한 겨울 바디에도 추천"],
        ],
      },
    ],
  },
  {
    id: "UCmockSwan000000000000",
    name: "스완SWAN_현실남자관리",
    handle: null,
    subscriberCount: 12000,
    updatedAt: "2026-09-30T15:00:00+09:00",
    videos: [
      {
        id: "mockSwan001",
        title: "남자 토너 하나만 쓴다면? 3주 사용 후기",
        publishedAt: "2026-05-14T18:00:00+09:00",
        durationMinutes: 8,
        mentions: [[1, 47, "recommended", "면도 뒤 따가움 없이 진정"]],
      },
    ],
  },
  {
    id: "UCmockEmpty00000000000",
    name: "준비 중인 채널",
    handle: null,
    subscriberCount: null,
    updatedAt: "2026-09-01T15:00:00+09:00",
    videos: [],
  },
];

const productOf = (id: number) => {
  const product = allProducts.find((item) => item.id === id);
  if (!product) throw new Error(`목 유튜브 언급의 제품 ${id} 이 목 제품에 없다.`);
  return product;
};

const categoryOf = (productId: number) => {
  const categoryId = productCategoryIds.get(productId);
  const child = categories.flatMap((category) => category.children).find((item) => item.id === categoryId);
  return child ? { id: child.id, name: child.name } : null;
};

const mentionsOf = (video: VideoSeed): YouTubeMentionResponse[] =>
  video.mentions.map(([productId, seconds, recommendation, summary], index) => {
    const product = productOf(productId);
    const sameProduct = video.mentions.filter(([other]) => other === productId);
    return {
      ordinal: index + 1,
      productId,
      productName: product.name,
      brandName: product.brand.name,
      productImageUrl: product.imageUrl,
      spokenName: product.name,
      startMs: seconds * 1000,
      endMs: null,
      summary,
      recommendation,
      recommendationCondition: null,
      // 영상×제품의 의견. 같은 제품을 여러 번 말했으면 첫 발언의 의견으로 둔다.
      videoRecommendation: sameProduct[0][2],
      recommendedVideoCount: 1,
    };
  });

const videosOf = (channel: ChannelSeed): YouTubeVideoResponse[] =>
  channel.videos.map((video) => ({
    id: video.id,
    channelId: channel.id,
    channelName: channel.name,
    title: video.title,
    description: "",
    thumbnailUrl: null,
    durationMs: video.durationMinutes * 60 * 1000,
    publishedAt: video.publishedAt,
    viewCount: null,
    mentions: mentionsOf(video),
  }));

/** 영상×제품 단위로 센 의견 수. 서버와 같은 단위다. */
const opinionsOf = (channel: ChannelSeed): OpinionCounts => {
  const counts = { recommended: 0, mixed: 0, notRecommended: 0, other: 0 };
  for (const video of videosOf(channel)) {
    const seen = new Set<number>();
    for (const mention of video.mentions) {
      if (seen.has(mention.productId)) continue;
      seen.add(mention.productId);
      if (mention.videoRecommendation === "recommended") counts.recommended += 1;
      else if (mention.videoRecommendation === "mixed") counts.mixed += 1;
      else if (mention.videoRecommendation === "not_recommended") counts.notRecommended += 1;
      else counts.other += 1;
    }
  }
  return counts;
};

const productsOf = (channel: ChannelSeed): YouTubeProduct[] => {
  const videos = videosOf(channel);
  const ids = [...new Set(videos.flatMap((video) => video.mentions.map((mention) => mention.productId)))];
  return ids.map((id) => {
    const product = productOf(id);
    const mentioned = videos.filter((video) => video.mentions.some((mention) => mention.productId === id));
    return {
      id,
      name: product.name,
      brandName: product.brand.name,
      imageUrl: product.imageUrl,
      recommendedVideoCount: mentioned.filter((video) =>
        video.mentions.some((mention) => mention.productId === id && mention.videoRecommendation === "recommended"),
      ).length,
      videoCount: mentioned.length,
      lastMentionedAt: mentioned[0]?.publishedAt ?? channel.updatedAt,
      category: categoryOf(id),
    };
  });
};

const channelOf = (channel: ChannelSeed): YouTubeChannel => {
  const videos = videosOf(channel);
  return {
    id: channel.id,
    name: channel.name,
    subscriberCount: channel.subscriberCount,
    profileImageUrl: null,
    bannerImageUrl: null,
    videoCount: videos.length,
    productCount: productsOf(channel).length,
    totalViewCount: (channel.subscriberCount ?? 0) * 2,
    handle: channel.handle,
    updatedAt: channel.updatedAt,
    opinionCounts: opinionsOf(channel),
  };
};

const page = <T>(items: readonly T[], url: URL, defaultLimit: number) => {
  const limit = Number(url.searchParams.get("limit") ?? defaultLimit);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  return items.slice(offset, offset + limit);
};

const findChannel = (id: unknown) => CHANNELS.find((channel) => channel.id === id);

const channelNotFound = () =>
  HttpResponse.json(
    { title: "Not Found", status: 404, detail: "유튜브 채널을 찾을 수 없습니다.", code: "NOT_FOUND" },
    { status: 404 },
  );

export const youtubeHandlers = [
  http.get("*/api/youtube/channels", ({ request }) =>
    HttpResponse.json(page(CHANNELS.map(channelOf), new URL(request.url), 20)),
  ),

  http.get("*/api/youtube/channels/:channelId", ({ params }) => {
    const channel = findChannel(params.channelId);
    return channel ? HttpResponse.json(channelOf(channel)) : channelNotFound();
  }),

  http.get("*/api/youtube/channels/:channelId/videos", ({ params, request }) => {
    const channel = findChannel(params.channelId);
    return channel ? HttpResponse.json(page(videosOf(channel), new URL(request.url), 10)) : channelNotFound();
  }),

  http.get("*/api/youtube/channels/:channelId/products", ({ params }) => {
    const channel = findChannel(params.channelId);
    return channel ? HttpResponse.json(productsOf(channel)) : channelNotFound();
  }),

  /** 제품을 언급한 영상. 최근 영상부터, 영상마다 이 제품의 언급만 담는다. limit · offset 은 영상 단위다. */
  http.get("*/api/products/:productId/youtube-mentions", ({ params, request }) => {
    const productId = Number(params.productId);
    const videos = CHANNELS.flatMap(videosOf)
      .map((video) => ({ ...video, mentions: video.mentions.filter((mention) => mention.productId === productId) }))
      .filter((video) => video.mentions.length > 0)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return HttpResponse.json(page(videos, new URL(request.url), 10));
  }),
];
