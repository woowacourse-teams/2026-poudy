/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { YouTubeHomeSection } from "./ChannelCards";
import { type ChannelListItem, ChannelList } from "./ChannelList";

import { track } from "@/lib/analytics/track";
import { fetchRecentMentions, type RecentMention, type YouTubeChannel } from "@/lib/api/youtube";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/api/youtube", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/youtube")>()),
  fetchRecentMentions: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const product = (id: number, recommendedVideoCount: number) => ({
  id,
  name: `제품 ${id}`,
  brandName: "브랜드",
  imageUrl: null,
  recommendedVideoCount,
  videoCount: 10,
  lastMentionedAt: "2026-11-01T00:00:00Z",
});
const channel = (id: string, name: string, extra: Partial<YouTubeChannel> = {}): YouTubeChannel => ({
  id,
  name,
  subscriberCount: 100,
  totalViewCount: 200,
  updatedAt: "2026-11-01T00:00:00Z",
  profileImageUrl: null,
  bannerImageUrl: null,
  handle: null,
  videoCount: 2,
  productCount: 2,
  ...extra,
});
const items: readonly ChannelListItem[] = [
  {
    channel: channel("a", "가 채널", { opinionCounts: { recommended: 3, mixed: 4, notRecommended: 1, other: 0 } }),
    products: [product(1, 10), product(2, 0)],
  },
  {
    channel: channel("b", "나 채널", { subscriberCount: 500, totalViewCount: 100, updatedAt: "2026-11-02T00:00:00Z" }),
    products: [product(3, 1), product(4, 1)],
  },
  {
    channel: channel("c", "다 채널", {
      subscriberCount: null,
      totalViewCount: 300,
      updatedAt: "2026-11-03T00:00:00Z",
      opinionCounts: { recommended: 0, mixed: 0, notRecommended: 0, other: 0 },
    }),
    products: [product(5, 0), product(6, 0), product(7, 0)],
  },
];
const names = () => screen.getAllByRole("heading", { level: 2 }).map((el) => el.textContent);

describe("유튜버 목록", () => {
  it("관리자 순서와 무관하게 네 가지 기준으로 정렬하고 유튜버 수를 적는다", async () => {
    const user = userEvent.setup();
    render(<ChannelList items={items} />);
    expect(screen.getByText("총 3명")).toBeInTheDocument();
    expect(names()).toEqual(["다 채널", "가 채널", "나 채널"]);
    await user.click(screen.getByRole("option", { name: "구독자 많은 순", hidden: true }));
    expect(names()).toEqual(["나 채널", "가 채널", "다 채널"]);
    await user.click(screen.getByRole("option", { name: "최신 업데이트 순", hidden: true }));
    expect(names()).toEqual(["다 채널", "나 채널", "가 채널"]);
    await user.click(screen.getByRole("option", { name: "추천 제품 많은 순", hidden: true }));
    expect(names()).toEqual(["나 채널", "가 채널", "다 채널"]);
    expect(items.map((item) => item.channel.id)).toEqual(["a", "b", "c"]);
  });

  it("같은 집계값은 관리자 순서가 아닌 이름 순으로 표시한다", () => {
    render(
      <ChannelList
        items={[...items].reverse().map((item) => ({ ...item, channel: { ...item.channel, totalViewCount: 10 } }))}
      />,
    );
    expect(names()).toEqual(["가 채널", "나 채널", "다 채널"]);
  });

  it("행은 상세로 가는 한 줄이고, 의견 수가 있을 때만 0 인 항목까지 막대 옆에 적는다", () => {
    render(<ChannelList items={items} />);
    const row = screen.getByRole("link", { name: /가 채널/ });
    expect(row).toHaveAttribute("href", "/youtubers/a");
    expect(within(row).getByText("장단점 4").parentElement).toHaveTextContent("추천 3 · 장단점 4비추천 1 · 그 외 0");
    // 의견 수가 없는 채널(서버 필드 전)과 합이 0 인 채널은 막대와 수를 그리지 않는다.
    expect(within(screen.getByRole("link", { name: /나 채널/ })).queryByText(/추천/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /다 채널/ })).queryByText(/추천/)).not.toBeInTheDocument();
    // 제품 사진 칸은 두지 않는다.
    expect(screen.queryByRole("link", { name: /제품 상세/ })).not.toBeInTheDocument();
  });
});

const mention = (productId: number, recommendation: string, summary: string) => ({
  videoId: "video",
  mention: {
    ordinal: productId,
    productId,
    productName: `제품 ${productId}`,
    brandName: "브랜드",
    productImageUrl: null,
    spokenName: "",
    startMs: 1000,
    endMs: null,
    summary,
    recommendation,
    recommendationCondition: null,
    videoRecommendation: recommendation,
    recommendedVideoCount: 1,
  },
});
const homeChannels = [channel("a", "가 채널"), channel("b", "나 채널")];
const initial: readonly RecentMention[] = [
  mention(1, "recommended", "붉은기 진정이 필요할 때 추천"),
  mention(2, "mixed", "효과는 좋지만 민감한 날엔 따가움"),
  mention(3, "not_recommended", "눈가가 따가워 비추천"),
];

describe("홈 유튜버 섹션", () => {
  it("첫 유튜버를 고른 채 최근 언급을 의견 태그와 함께 보여 주고, 행은 영상 탭의 제품 거르기로 간다", () => {
    render(<YouTubeHomeSection channels={homeChannels} initialMentions={initial} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("평소 보는 유튜버가 있나요?");
    expect(screen.getByRole("button", { name: "가 채널" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "나 채널" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("장단점")).toBeInTheDocument();
    expect(screen.getByText("비추천")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /붉은기 진정이 필요할 때 추천/ })).toHaveAttribute(
      "href",
      "/youtubers/a?tab=videos&product=1",
    );
    expect(screen.getByRole("link", { name: "유튜버 전체 보기" })).toHaveAttribute("href", "/youtubers");
  });

  it("다른 유튜버를 고르면 이벤트를 남기고 그 사람의 언급을 받아 오며, 한 번 받은 언급은 다시 받지 않는다", async () => {
    vi.mocked(fetchRecentMentions).mockResolvedValue([mention(9, "neutral", "예전에 잘 썼던 토너로 회고")]);
    render(<YouTubeHomeSection channels={homeChannels} initialMentions={initial} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "나 채널" })));
    expect(track).toHaveBeenCalledWith("home_youtuber_selected", { channel_id: "b", position: 2 });
    expect(fetchRecentMentions).toHaveBeenCalledWith("b");
    expect(await screen.findByText("예전에 잘 썼던 토너로 회고")).toBeInTheDocument();
    expect(screen.getByText("정보성 언급")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /예전에 잘 썼던/ })).toHaveAttribute(
      "href",
      "/youtubers/b?tab=videos&product=9",
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "가 채널" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "나 채널" })));
    expect(fetchRecentMentions).toHaveBeenCalledTimes(1);
  });

  it("첫 유튜버의 언급을 받지 못했으면 섹션 오류와 다시 시도를 둔다", async () => {
    vi.mocked(fetchRecentMentions).mockResolvedValue(initial);
    render(<YouTubeHomeSection channels={homeChannels} initialMentions={null} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "다시 시도" })));
    expect(fetchRecentMentions).toHaveBeenCalledWith("a");
    expect(await screen.findByText("붉은기 진정이 필요할 때 추천")).toBeInTheDocument();
  });

  it("유튜버 이름은 한 줄로 자르지 않고 두 줄까지 보이며, 넘치면 둘째 줄 끝을 말줄임한다(S288)", () => {
    const long = channel("long", "아주 긴 이름을 가진 뷰티 유튜버 채널");
    render(<YouTubeHomeSection channels={[long, ...homeChannels]} initialMentions={initial} />);
    const name = within(screen.getByRole("button", { name: "아주 긴 이름을 가진 뷰티 유튜버 채널" })).getByText(
      "아주 긴 이름을 가진 뷰티 유튜버 채널",
    );
    expect(name).toHaveClass("line-clamp-2");
    expect(name).not.toHaveClass("truncate");
  });

  it("세울 유튜버가 없으면 섹션을 그리지 않는다", () => {
    const { container } = render(<YouTubeHomeSection channels={[]} initialMentions={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
