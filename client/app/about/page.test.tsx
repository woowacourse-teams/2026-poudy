// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/TopBar", () => ({ TopBar: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));

import AboutPage from "./page";

describe("서비스 소개 /about", () => {
  it("누구의 어떤 문제를 푸는 서비스인지 첫 제목으로 보여 준다", () => {
    render(<AboutPage />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toHaveTextContent("다들 좋다는데,왜 나한테는 안 맞을까요?");
    expect(heading.nextElementSibling).toHaveTextContent("써 본 화장품을 선반에 모으면나와 안 맞는 성분을 찾아 드려요");
  });

  it("넓은 화면에서는 앱 틀 밖으로 나와 화면 전체를 쓴다", () => {
    render(<AboutPage />);

    expect(screen.getByRole("main")).toHaveAttribute("data-desktop-page");
  });

  it("등록된 제품·성분 수와 브랜드 수를 기준 달과 함께 보여 준다", () => {
    render(<AboutPage />);

    const stats = screen.getByRole("region", { name: "파우디는 지금" });

    expect(within(stats).getByText("1,240")).toBeInTheDocument();
    expect(within(stats).getByText("22,013")).toBeInTheDocument();
    expect(within(stats).getByText(/39개 브랜드의 공개된 전성분표를/)).toBeInTheDocument();
    expect(within(stats).getByText("2026년 10월 기준")).toBeInTheDocument();
  });

  it("선반을 쓰는 세 단계를 화면 조각과 함께 순서대로 보여 준다", () => {
    render(<AboutPage />);

    const shelf = screen.getByRole("region", { name: /나에게 맞춰져요/ });
    const steps = within(shelf).getAllByRole("listitem");

    expect(steps.map((step) => within(step).getByRole("heading").textContent)).toEqual([
      "써 본 제품을 담아요",
      "잘 맞았는지 골라요",
      "안 맞을 수 있는 성분을 찾아 드려요",
    ]);
    for (const step of steps) expect(within(step).getByRole("img")).toHaveAccessibleName();
  });

  it("나만의 필터·성분으로 찾기·전성분을 각자의 화면 조각으로 소개한다", () => {
    render(<AboutPage />);

    for (const name of [/검색할 때 빼고 보여 드려요/, /피하고 싶은 성분은 빼고/, /표기 순서 그대로/]) {
      const section = screen.getByRole("region", { name });
      expect(within(section).getByRole("img")).toHaveAccessibleName();
    }
  });

  /*
   * 화면 조각은 화면 폭마다 다른 그림을 쓴다. 칸 폭이 달라 조각 안 줄바꿈과 크기가 다르기 때문이다.
   * 데스크톱 그림이 빠지면 좁은 화면용 그림을 늘여 그리게 된다.
   */
  it("화면 조각은 데스크톱에서 넓은 화면용 그림으로 바꿔 그린다", () => {
    const { container } = render(<AboutPage />);

    const wideSources = container.querySelectorAll('source[media="(min-width: 1024px)"]');

    expect(wideSources.length).toBeGreaterThanOrEqual(7);
    for (const source of wideSources) expect(source.getAttribute("srcset")).toMatch(/(-wide|-desktop)\.webp/);
  });

  it("자주 묻는 질문은 첫 질문만 펼쳐 두고, 로그인 없이 쓸 수 있는 범위도 답한다", async () => {
    render(<AboutPage />);

    const faq = screen.getByRole("region", { name: "자주 묻는 질문" });
    const first = within(faq).getByRole("button", { name: "안 맞을 수 있는 성분은 어떻게 찾나요?" });
    const login = within(faq).getByRole("button", { name: "로그인하지 않아도 쓸 수 있나요?" });

    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(login).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(login);

    expect(login).toHaveAttribute("aria-expanded", "true");
    expect(within(faq).getByText(/로그인 없이도 쓸 수 있어요/)).toBeInTheDocument();
  });

  it("써 본 화장품이 있으면 선반으로, 처음이면 성분 찾기로 이어 준다", () => {
    render(<AboutPage />);

    const start = screen.getByRole("region", { name: /시작해 보세요/ });

    expect(within(start).getByRole("link", { name: "내 선반 만들기" })).toHaveAttribute("href", "/shelf");
    expect(within(start).getByRole("link", { name: "성분으로 찾아보기" })).toHaveAttribute(
      "href",
      "/search/ingredients",
    );
  });

  it("푸터에서 지금 보고 있는 서비스 소개를 짚어 준다", () => {
    render(<AboutPage />);

    expect(screen.getByRole("link", { name: "서비스 소개" })).toHaveAttribute("aria-current", "page");
  });
});
