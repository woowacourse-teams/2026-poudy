/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CurationCarousel } from "./CurationCarousel";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const items = [
  {
    id: 1,
    title: "가을 장벽",
    description: "보습 성분 모아보기",
    thumbnailImageUrl: "/images/a.jpg",
  },
  {
    id: 2,
    title: "순한 클렌징",
    description: "설페이트 뺀 클렌저",
    thumbnailImageUrl: "/images/b.jpg",
  },
];

describe("CurationCarousel", () => {
  it("받은 큐레이션의 제목과 설명을 그린다", () => {
    render(<CurationCarousel items={items} />);

    /* 앞뒤로 여벌 카드를 두어 같은 제목이 여러 번 나온다. 하나라도 그려졌으면 된다. */
    expect(screen.getAllByText("가을 장벽").length).toBeGreaterThan(0);
    expect(screen.getAllByText("보습 성분 모아보기").length).toBeGreaterThan(0);
  });

  /*
   * 큐레이션이 비었다고 통째로 걷어내면 아래의 인기 검색어부터가 위로 올라붙는다. 그러면
   * 큐레이션이 들어오는 순간 화면이 한 번 밀린다. 빈 카드로 자리를 잡아 그 밀림을 막는다.
   */
  it("큐레이션이 없어도 자리를 지킨다", () => {
    const { container } = render(<CurationCarousel items={[]} />);

    const section = container.querySelector("section");

    expect(section).not.toBeNull();
    /* 카드와 같은 높이여야 들어왔을 때 자리가 그대로다. */
    expect(container.querySelector(".h-52")).not.toBeNull();
  });

  /* 사람이 할 일이 없는 자리라 낭독기에서는 읽어 줄 것이 없다. */
  it("빈 자리는 낭독기에서 숨긴다", () => {
    const { container } = render(<CurationCarousel items={[]} />);

    expect(container.querySelector("section")).toHaveAttribute("aria-hidden", "true");
  });
});
