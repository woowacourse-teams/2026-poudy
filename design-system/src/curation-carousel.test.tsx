/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  CurationCarousel,
  CurationCarouselCard,
  CurationCarouselGuideCard,
  CurationCarouselSlide,
} from "./curation-carousel";

const card = (title: string) => (
  <CurationCarouselCard image={<img src="/a.jpg" alt="" />} title={title} description={`${title} 설명`} />
);

/*
 * 넘기는 동작은 홈의 client 감싸개 테스트(client/components/home/CurationCarousel.test.tsx)가 실제 화면 구성으로 살핀다.
 * 여기서는 부품이 쓰는 쪽에 약속하는 것만 본다.
 */
describe("CurationCarousel", () => {
  it("칸 수로 자리 표시를 세고, 위치를 글자로도 알린다", () => {
    render(
      <CurationCarousel label="큐레이션">
        <CurationCarouselSlide index={0}>
          <a href="#a">{card("가")}</a>
        </CurationCarouselSlide>
        <CurationCarouselSlide index={1}>
          <a href="#b">{card("나")}</a>
        </CurationCarouselSlide>
      </CurationCarousel>,
    );

    expect(screen.getByRole("region", { name: "큐레이션" })).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toHaveClass("carousel-counter");
    expect(screen.getByText("큐레이션 1 / 2")).toHaveAttribute("aria-live", "polite");
  });

  it("한 장뿐이면 자리 표시를 띄우지 않는다", () => {
    const { container } = render(
      <CurationCarousel label="큐레이션">
        <CurationCarouselSlide index={0}>
          <a href="#a">{card("가")}</a>
        </CurationCarouselSlide>
      </CurationCarousel>,
    );

    expect(container.querySelector(".carousel-counter")).toBeNull();
  });

  it("칸이 없으면 빈 카드로 자리를 지키고 낭독기에서 숨긴다", () => {
    const { container } = render(<CurationCarousel label="큐레이션" />);

    expect(container.querySelector("section")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".aspect-15\\/8")).not.toBeNull();
  });

  it("가운데 칸을 누르면 onOpen 을 부르고, 칸의 링크는 끌어 옮길 수 없다", () => {
    const onOpen = vi.fn();
    render(
      <CurationCarousel label="큐레이션">
        <CurationCarouselSlide index={0} onOpen={onOpen}>
          <a href="#a">{card("가")}</a>
        </CurationCarouselSlide>
      </CurationCarousel>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("draggable", "false");
    expect(link).toHaveClass("flex", "h-full");
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("카드 설명은 오른쪽에 자리 표시 몫을 비운다", () => {
    render(
      <CurationCarousel label="큐레이션">
        <CurationCarouselSlide index={0}>
          <a href="#guide">
            <CurationCarouselGuideCard badge="서비스 가이드" badgeIcon="book" title="제목" description="가이드 설명" />
          </a>
        </CurationCarouselSlide>
        <CurationCarouselSlide index={1}>
          <a href="#a">{card("가")}</a>
        </CurationCarouselSlide>
      </CurationCarousel>,
    );

    expect(screen.getByText("가이드 설명")).toHaveClass("carousel-counter-clearance");
    expect(screen.getByText("가 설명")).toHaveClass("carousel-counter-clearance", "whitespace-pre-line");
  });
});
