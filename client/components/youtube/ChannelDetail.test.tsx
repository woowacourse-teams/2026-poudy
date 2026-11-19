/** @vitest-environment jsdom */
import type { YouTubeVideoResponse } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChannelDetail } from "./ChannelDetail";

import { track } from "@/lib/analytics/track";
import type { YouTubeChannel, YouTubeProduct } from "@/lib/api/youtube";
import { markPop, markPush } from "@/lib/navigation/history-depth";
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
/* 라우터가 없는 테스트에서도 Link 의 onNavigate 가 불리도록, 같은 탭 이동만 흉내 낸다. 라우터 이동 자체는 하지 않는다. */
vi.mock("next/link", () => ({
  default: ({
    href,
    onClick,
    onNavigate,
    ...props
  }: ComponentProps<"a"> & {
    readonly href: string;
    readonly onNavigate?: (event: { readonly preventDefault: () => void }) => void;
  }) => (
    <a
      // 라우터에만 쓰는 값(replace 등)은 a 에 넘기지 않는다.
      {...Object.fromEntries(Object.entries(props).filter(([key]) => !["replace", "prefetch", "scroll"].includes(key)))}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        onNavigate?.({ preventDefault: () => undefined });
      }}
    />
  ),
}));
const back = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
/** 화면이 들어온 주소. 탭 · 거르기 · 재생 시트는 주소에서 읽는다. */
const visit = (search = "") => window.history.replaceState(null, "", `/youtubers/channel${search}`);
beforeEach(() => {
  vi.clearAllMocks();
  visit();
  [1, 2, 3, 4, 5].forEach(() => markPop());
});

const channel = {
  subscriberCount: null,
  profileImageUrl: null,
  bannerImageUrl: null,
  handle: "@handle",
  id: "channel",
  name: "테스트 유튜버",
  videoCount: 2,
  productCount: 2,
  totalViewCount: 0,
  updatedAt: "2026-11-05T00:00:00Z",
} satisfies YouTubeChannel;
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
  {
    id: 2,
    imageUrl: null,
    name: "다른 제품",
    brandName: "브랜드",
    recommendedVideoCount: 0,
    videoCount: 1,
    lastMentionedAt: "2026-11-01T00:00:00Z",
  },
] satisfies YouTubeProduct[];
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
    viewCount: 1200,
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
    mentions: [
      {
        ...mention,
        productId: 2,
        productName: "다른 제품",
        summary: "끈적여서 비추천",
        recommendation: "not_recommended",
        videoRecommendation: "not_recommended",
      },
    ],
  },
] satisfies YouTubeVideoResponse[];
const player = () => screen.getByTitle("첫 영상");

describe("유튜버 상세 · 영상 탭", () => {
  it("언급의 의견을 그대로 태그로 보이고, 같은 제품은 최초 시각 한 줄로 합쳐 영상×제품의 의견을 쓴다", () => {
    const repeated = [
      {
        ...videos[0],
        mentions: [
          { ...mention, ordinal: 2, startMs: 1026000, summary: "나중의 반복 발언", recommendation: "mixed" },
          { ...mention, videoRecommendation: "mixed" },
        ],
      },
      videos[1],
    ];
    visit("?tab=videos");
    render(<ChannelDetail channel={channel} products={products} videos={repeated} />);
    expect(screen.getByText("보습에 좋다고 추천한다")).toBeInTheDocument();
    expect(screen.queryByText("나중의 반복 발언")).not.toBeInTheDocument();
    expect(screen.getByText("장단점")).toBeInTheDocument();
    expect(screen.getByText("비추천")).toBeInTheDocument();
    expect(repeated[0].mentions).toHaveLength(2);
    // 조회수는 그리지 않는다.
    expect(screen.queryByText(/조회수/)).not.toBeInTheDocument();
  });

  it("언급을 누르면 재생 시트가 그 시각부터 열리고, 시트의 다른 줄을 누르면 그 시각으로 넘어간다", () => {
    const two = [{ ...videos[0], mentions: [mention, { ...mention, ordinal: 2, productId: 2, startMs: 90000 }] }];
    visit("?tab=videos");
    render(<ChannelDetail channel={channel} products={products} videos={two} />);
    fireEvent.click(screen.getByRole("button", { name: /1:04.*보습에 좋다고 추천한다/ }));
    expect(player()).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghij1?start=64&autoplay=1&enablejsapi=1",
    );
    expect(window.location.search).toBe("?tab=videos&video=abcdefghij1&t=64");
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("button", { name: /1:04/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(sheet).getByRole("button", { name: /1:30/ }));
    expect(player()).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghij1?start=90&autoplay=1&enablejsapi=1",
    );
    expect(track).toHaveBeenCalledWith(
      "youtube_video_play_requested",
      expect.objectContaining({ video_id: "abcdefghij1", start_ms: 90000, placement: "mention_timestamp" }),
    );
  });

  it("영상 머리를 누르면 처음부터 재생하고 YouTube 바깥 링크는 남긴다", () => {
    visit("?tab=videos");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    fireEvent.click(screen.getByRole("button", { name: "첫 영상 재생" }));
    expect(player()).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghij1?start=0&autoplay=1&enablejsapi=1",
    );
    fireEvent.click(screen.getByRole("link", { name: "첫 영상 YouTube에서 열기" }));
    expect(track).toHaveBeenCalledWith(
      "youtube_external_link_clicked",
      expect.objectContaining({ target: "video", video_id: "abcdefghij1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(window.location.search).toBe("?tab=videos");
  });

  it("주소의 video · t 로 들어오면 그 영상의 재생 시트를 그 시각으로 열고 재생 요청으로 남긴다", () => {
    visit("?tab=videos&product=1&video=abcdefghij1&t=64");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(player()).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghij1?start=64&autoplay=1&enablejsapi=1",
    );
    expect(track).toHaveBeenCalledWith(
      "youtube_video_play_requested",
      expect.objectContaining({ video_id: "abcdefghij1", start_ms: 64000, placement: "link", product_id: 1 }),
    );
  });

  it("언급 아래 제품 줄은 제품 상세로 가는 링크다", () => {
    visit("?tab=videos");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.getByRole("link", { name: "브랜드 · 정식 제품명" })).toHaveAttribute("href", "/products/1");
  });
  it("영상 머리의 hover 면은 다른 행처럼 화면 폭 끝까지 깐다", () => {
    visit("?tab=videos");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    const head = screen.getByRole("button", { name: "첫 영상 재생" });
    expect(head).toHaveClass("fb-bleed");
    expect(head).not.toHaveClass("fb-surface", "rounded-sm");
  });
});

describe("유튜버 상세 · 제품 탭", () => {
  it("언급한 제품을 3열 칸으로 보이고 의견 표지와 정렬은 두지 않는다", () => {
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "브랜드 정식 제품명" })).toHaveAttribute(
      "href",
      "/youtubers/channel?tab=videos&product=1",
    );
    expect(screen.queryByText(/추천 1회/)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    // 채널 의견 수는 받은 영상에서 센다(영상×제품 단위).
    expect(screen.getByText("비추천 1").parentElement).toHaveTextContent("추천 1 · 장단점 0 · 비추천 1 · 그 외 0");
    expect(track).not.toHaveBeenCalledWith("youtube_video_play_requested", expect.anything());
  });

  it("제품에 소분류가 있을 때만 카테고리 칩을 두고, 고르면 그 소분류의 제품만 남긴다", () => {
    const { unmount } = render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.queryByRole("group", { name: "카테고리" })).not.toBeInTheDocument();
    unmount();
    const categorized = [
      { ...products[0], category: { id: 4, name: "크림" } },
      { ...products[1], category: { id: 2, name: "스킨/토너" } },
    ];
    render(<ChannelDetail channel={channel} products={categorized} videos={videos} />);
    const chips = screen.getByRole("group", { name: "카테고리" });
    expect(within(chips).getByRole("button", { name: "전체 2" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(chips).getByRole("button", { name: "크림 1" }));
    expect(screen.getByRole("link", { name: "브랜드 정식 제품명" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "브랜드 다른 제품" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?category=4");
  });
});

describe("유튜버 상세의 제품 거르기(S294)", () => {
  it("제품 탭의 칸을 누르면 제품 상세가 아니라 그 제품으로 거른 영상 탭으로 가고, 뒤로 가면 제품 탭의 보던 자리로 돌아온다", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(320);
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    const length = window.history.length;

    fireEvent.click(screen.getByRole("link", { name: "브랜드 정식 제품명" }));

    expect(window.location.pathname).toBe("/youtubers/channel");
    expect(window.location.search).toBe("?tab=videos&product=1");
    expect(window.history.length).toBe(length + 1);
    expect(screen.getByRole("tab", { name: "영상 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "브랜드 정식 제품명 제품 상세" })).toHaveAttribute("href", "/products/1");
    expect(screen.queryByText("다른 영상")).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("youtube_product_selected", expect.objectContaining({ product_id: 1 }));
    expect(track).toHaveBeenCalledWith("youtube_videos_viewed", expect.objectContaining({ product_id: 1 }));

    const popped = new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
    window.history.back();
    await act(async () => {
      await popped;
    });

    expect(window.location.search).toBe("");
    expect(screen.getByRole("tab", { name: "제품 2" })).toHaveAttribute("aria-selected", "true");
    expect(scrollTo).toHaveBeenCalledWith({ top: 320 });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("위에 제품 행과 영상 수를 두고, 목록 끝 버튼으로 거르기를 푼다", () => {
    visit("?tab=videos&product=1");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.getByRole("link", { name: "브랜드 정식 제품명 제품 상세" })).toHaveAttribute("href", "/products/1");
    expect(screen.getByRole("heading", { name: "이 제품을 말한 영상 1" })).toBeInTheDocument();
    expect(screen.queryByText("다른 영상")).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "youtube_videos_viewed",
      expect.objectContaining({ channel_id: channel.id, product_id: 1, result_count: 1 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "전체 영상 2개 보기" }));
    expect(screen.getByText("다른 영상")).toBeInTheDocument();
    expect(window.location.search).toBe("?tab=videos");
  });

  it("영상의 제품 줄도 제품 콘텐츠 열람에 포함한다", () => {
    visit("?tab=videos");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(track).toHaveBeenCalledWith(
      "youtube_products_viewed",
      expect.objectContaining({ channel_id: channel.id, result_count: 2 }),
    );
    expect(track).not.toHaveBeenCalledWith("youtube_video_play_requested", expect.anything());
  });
});

describe("유튜버 상세의 뒤로 가기 (#1258)", () => {
  it("탭을 바꾸면 방문 기록을 쌓지 않고 주소만 바꾸고, 방향키로도 탭을 바꾼다", () => {
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    const length = window.history.length;
    fireEvent.click(screen.getByRole("tab", { name: "영상 2" }));
    expect(window.location.search).toBe("?tab=videos");
    fireEvent.click(screen.getByRole("tab", { name: "제품 2" }));
    expect(window.location.search).toBe("");
    act(() => screen.getByRole("tab", { name: "제품 2" }).focus());
    fireEvent.keyDown(screen.getByRole("tab", { name: "제품 2" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "영상 2" })).toHaveAttribute("aria-selected", "true");
    expect(window.history.length).toBe(length);
  });

  it("제품 상세에서 돌아오면 서버가 처음 넘긴 값이 아니라 주소의 탭과 거르기로 다시 그린다", () => {
    visit("?tab=videos&product=1");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.getByRole("tab", { name: "영상 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "전체 영상 2개 보기" })).toBeInTheDocument();
  });

  it("없는 제품으로 거른 주소는 거르지 않는다", () => {
    visit("?tab=videos&product=999");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);
    expect(screen.queryByRole("button", { name: /전체 영상/ })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?tab=videos");
  });
});

describe("유튜버 화면의 뒤로가기", () => {
  it("메인처럼 사이트 안에서 들어왔으면 목록을 거치지 않고 이전 화면으로 한 번에 돌아간다", () => {
    act(() => markPush());
    visit("?tab=videos&product=1");
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);

    fireEvent.click(screen.getByRole("button", { name: "이전 화면" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("공유 링크로 바로 들어왔으면 유튜버 목록으로 가는 링크가 된다", () => {
    render(<ChannelDetail channel={channel} products={products} videos={videos} />);

    expect(screen.getByRole("link", { name: "유튜버 목록으로" })).toHaveAttribute("href", "/youtubers");
  });
});
