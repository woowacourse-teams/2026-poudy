/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { type ChannelCardData, YouTubeHomeSection } from "./ChannelCards";
import { ChannelList } from "./ChannelList";

const product = (id: number, recommendedVideoCount: number) => ({
  id,
  name: `제품 ${id}`,
  brandName: "브랜드",
  imageUrl: null,
  recommendedVideoCount,
  videoCount: 10,
  lastMentionedAt: "2026-11-01T00:00:00Z",
});
const items: readonly ChannelCardData[] = [
  {
    channel: {
      id: "a",
      name: "가 채널",
      subscriberCount: 100,
      totalViewCount: 200,
      updatedAt: "2026-11-01T00:00:00Z",
      profileImageUrl: null,
      bannerImageUrl: null,
      handle: null,
      videoCount: 2,
      productCount: 2,
    },
    products: [product(1, 10), product(2, 0)],
  },
  {
    channel: {
      id: "b",
      name: "나 채널",
      subscriberCount: 500,
      totalViewCount: 100,
      updatedAt: "2026-11-02T00:00:00Z",
      profileImageUrl: null,
      bannerImageUrl: null,
      handle: null,
      videoCount: 2,
      productCount: 2,
    },
    products: [product(3, 1), product(4, 1)],
  },
  {
    channel: {
      id: "c",
      name: "다 채널",
      subscriberCount: null,
      totalViewCount: 300,
      updatedAt: "2026-11-03T00:00:00Z",
      profileImageUrl: null,
      bannerImageUrl: null,
      handle: null,
      videoCount: 2,
      productCount: 3,
    },
    products: [product(5, 0), product(6, 0), product(7, 0)],
  },
];
const names = () => screen.getAllByRole("heading", { level: 2 }).map((el) => el.textContent);

it("관리자 순서와 무관하게 네 가지 기준으로 정렬한다", () => {
  render(<ChannelList items={items} />);
  const select = screen.getByRole("combobox", { name: "유튜버 정렬" });
  expect(names()).toEqual(["다 채널", "가 채널", "나 채널"]);
  fireEvent.change(select, { target: { value: "subscribers" } });
  expect(names()).toEqual(["나 채널", "가 채널", "다 채널"]);
  fireEvent.change(select, { target: { value: "updated" } });
  expect(names()).toEqual(["다 채널", "나 채널", "가 채널"]);
  fireEvent.change(select, { target: { value: "products" } });
  expect(names()).toEqual(["나 채널", "가 채널", "다 채널"]);
  expect(items.map((item) => item.channel.id)).toEqual(["a", "b", "c"]);
  expect(screen.getByRole("link", { name: "브랜드 제품 1 제품 상세" })).toHaveAttribute("href", "/products/1");
});

it("같은 집계값은 관리자 순서가 아닌 이름 순으로 표시한다", () => {
  render(
    <ChannelList
      items={[...items].reverse().map((item) => ({ ...item, channel: { ...item.channel, totalViewCount: 10 } }))}
    />,
  );
  expect(names()).toEqual(["가 채널", "나 채널", "다 채널"]);
});

it("홈은 관리자 순서와 추천 영상으로 가는 링크를 유지한다", () => {
  render(<YouTubeHomeSection items={[items[1], items[0], items[2]]} />);
  expect(screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent)).toEqual(["나 채널", "가 채널"]);
  expect(screen.getByRole("link", { name: "브랜드 제품 1 추천 10회" })).toHaveAttribute(
    "href",
    "/youtubers/a?tab=videos&product=1",
  );
});
