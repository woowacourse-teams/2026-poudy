/** @vitest-environment jsdom */
import type { YouTubeChannelResponse, YouTubeProductResponse, YouTubeVideoResponse } from "@poudy/api/api.zod";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChannelDetail } from "./ChannelDetail";

const channel = {
  subscriberCount: null,
  profileImageUrl: null,
  bannerImageUrl: null,
  handle: null,
  id: "channel",
  name: "테스트 유튜버",
  videoCount: 2,
  productCount: 1,
  updatedAt: "2026-11-05T00:00:00Z",
} satisfies YouTubeChannelResponse;
const products = [
  {
    id: 1,
    imageUrl: null,
    name: "정식 제품명",
    brandName: "브랜드",
    recommendedVideoCount: 1,
    videoCount: 1,
    lastMentionedAt: "2026-11-01T00:00:00Z",
  },
] satisfies YouTubeProductResponse[];
const mention = {
  productImageUrl: null,
  endMs: null,
  recommendationCondition: null,
  ordinal: 1,
  productId: 1,
  productName: "정식 제품명",
  brandName: "브랜드",
  spokenName: "발언명",
  startMs: 64100,
  summary: "보습에 좋다고 추천한다",
  recommendation: "recommended",
  videoRecommendation: "recommended",
  recommendedVideoCount: 1,
};
const videos = [
  {
    id: "abcdefghij1",
    thumbnailUrl: null,
    viewCount: null,
    channelId: channel.id,
    channelName: channel.name,
    title: "첫 영상",
    description: "",
    durationMs: 120000,
    publishedAt: "2026-11-01T00:00:00Z",
    mentions: [mention],
  },
  {
    id: "abcdefghij2",
    thumbnailUrl: null,
    viewCount: null,
    channelId: channel.id,
    channelName: channel.name,
    title: "다른 영상",
    description: "",
    durationMs: 120000,
    publishedAt: "2026-11-01T00:00:00Z",
    mentions: [{ ...mention, productId: 2 }],
  },
] satisfies YouTubeVideoResponse[];

describe("유튜버 화면", () => {
  it("제품의 영상 버튼은 필터와 작은 유튜버 헤더를 보여 주고 시각으로 재생한다", () => {
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByText("추천 1회")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /브랜드 정식 제품명/ })).toHaveAttribute("href", "/products/1");
    fireEvent.click(screen.getByRole("button", { name: "정식 제품명 영상 1개 보기" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(channel.name);
    expect(screen.queryByRole("heading", { name: "다른 영상" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1:04 보습에 좋다고 추천한다" }));
    expect(screen.getByTitle("첫 영상")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghij1?start=64&autoplay=1",
    );
    fireEvent.click(screen.getByRole("button", { name: "정식 제품명 필터 해제" }));
    expect(screen.getByRole("heading", { name: "다른 영상" })).toBeInTheDocument();
    expect(screen.queryByTitle("첫 영상")).not.toBeInTheDocument();
  });

  it("혼합 평가의 추천 구간도 정보성으로 보여 주며 키보드로 탭을 바꾼다", () => {
    const mixed = [{ ...videos[0], mentions: [{ ...mention, videoRecommendation: "mixed" }] }];
    render(<ChannelDetail channel={channel} products={products} videos={mixed} initialTab="videos" />);
    expect(screen.getByText("정보성 언급")).toBeInTheDocument();
    expect(within(screen.getByRole("tabpanel")).queryByText("추천")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("tab", { name: "영상 2" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "제품 1" })).toHaveAttribute("aria-selected", "true");
  });
});
