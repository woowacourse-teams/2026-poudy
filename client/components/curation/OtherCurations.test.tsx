/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OtherCurations } from "./OtherCurations";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.mocked(track).mockClear();
});

const curations = [
  {
    id: 1,
    title: "왜 발라도\n다시 건조할까?",
    description: "가을 보습을 이해하는 작은 안내서",
    thumbnailImageUrl: "/a.jpg",
  },
  {
    id: 2,
    title: "가을이 오면,\n보습도 한 단계 더",
    description: "낮아진 습도와 큰 일교차로\n평소의 보습이",
    thumbnailImageUrl: "/b.jpg",
  },
  { id: 3, title: "순한 클렌징", description: "설페이트 뺀 클렌저", thumbnailImageUrl: "/c.jpg" },
];

describe("OtherCurations", () => {
  it("지금 보고 있는 큐레이션을 빼고 나머지를 상세로 잇는다", () => {
    render(<OtherCurations currentId={2} curations={curations} />);

    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/curations/1", "/curations/3"]);
  });

  /* 카드 위에 얹는 글자라 홈 카드처럼 문구에 넣어 둔 줄바꿈을 그대로 살린다. */
  it("제목과 설명을 카드 안에 줄바꿈을 살려 얹는다", () => {
    render(<OtherCurations currentId={3} curations={curations} />);

    const title = screen.getByRole("heading", { name: /가을이 오면/ });

    expect(title).toHaveClass("whitespace-pre-line");
    expect(title.closest("article")).toContainElement(screen.getByText(/낮아진 습도와 큰 일교차로/));
  });

  it("누르면 상세 아래 목록에서 몇 번째를 눌렀는지 남긴다", () => {
    render(<OtherCurations currentId={1} curations={curations} />);

    fireEvent.click(screen.getByRole("link", { name: /순한 클렌징/ }));

    expect(track).toHaveBeenCalledWith("curation_opened", { curation_id: 3, position: 2, surface: "curation_detail" });
  });

  /* 이어 볼 것이 없는데 제목만 남으면 빈 자리가 된다. */
  it("다른 큐레이션이 없으면 제목째 그리지 않는다", () => {
    const { container } = render(<OtherCurations currentId={1} curations={[curations[0]]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
