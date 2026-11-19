/** @vitest-environment jsdom */
import type { YouTubeVideoResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductYouTubeMentions } from "./ProductYouTubeMentions";

import { fetchProductYouTubeMentions } from "@/lib/api/youtube";

vi.mock("@/lib/api/youtube", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/youtube")>()),
  fetchProductYouTubeMentions: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const video = (index: number): YouTubeVideoResponse => ({
  id: `video${index}`,
  channelId: `channel${index}`,
  channelName: `채널 ${index}`,
  title: `영상 ${index}`,
  description: "",
  thumbnailUrl: null,
  durationMs: 600000,
  publishedAt: "2026-11-01T00:00:00Z",
  viewCount: 100,
  mentions: [
    {
      ordinal: 1,
      productId: 7,
      productName: "제품",
      brandName: "브랜드",
      productImageUrl: null,
      spokenName: "",
      startMs: 633000 + index * 1000,
      endMs: null,
      summary: `요약 ${index}`,
      recommendation: index % 2 ? "mixed" : "recommended",
      recommendationCondition: "보이지 않는 조건",
      videoRecommendation: "recommended",
      recommendedVideoCount: 3,
    },
  ],
});
const renderSection = () => render(<ProductYouTubeMentions productId={7} />, { wrapper: ToastProvider });

describe("제품 상세 · 유튜버는 이렇게 썼어요", () => {
  it("영상 다섯을 받아 넷의 언급을 그리고, 다섯째가 오면 '영상 더 보기'로 다음 열 개를 붙인다", async () => {
    vi.mocked(fetchProductYouTubeMentions)
      .mockResolvedValueOnce([1, 2, 3, 4, 5].map(video))
      .mockResolvedValueOnce([5, 6].map(video));
    renderSection();
    expect(await screen.findByRole("heading", { name: "유튜버는 이렇게 썼어요" })).toBeInTheDocument();
    expect(fetchProductYouTubeMentions).toHaveBeenCalledWith(7, 0, 5);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByText("엇갈림", { exact: true })).toHaveLength(2);
    expect(screen.queryByText("보이지 않는 조건")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /요약 1/ })).toHaveAttribute(
      "href",
      "/youtubers/channel1?tab=videos&product=7&video=video1&t=634",
    );
    expect(screen.getByText("10:34부터 보기")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "영상 더 보기" })));
    expect(fetchProductYouTubeMentions).toHaveBeenLastCalledWith(7, 4, 11);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "영상 더 보기" })).not.toBeInTheDocument();
  });

  it("언급이 없거나 받지 못하면 제목까지 섹션을 그리지 않는다", async () => {
    vi.mocked(fetchProductYouTubeMentions).mockResolvedValueOnce([]);
    const { unmount } = renderSection();
    await act(async () => undefined);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    unmount();

    vi.mocked(fetchProductYouTubeMentions).mockRejectedValueOnce(new Error("실패"));
    renderSection();
    await act(async () => undefined);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
