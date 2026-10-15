// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/TopBar", () => ({ TopBar: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));

import AboutPage from "./page";

describe("서비스 소개 /about", () => {
  it("한 줄 설명과 누구의 어떤 문제를 푸는지 보여 준다", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("원하는 성분으로찾는 화장품");
    expect(screen.getByText("피하고 싶은 성분")).toBeInTheDocument();
    expect(screen.getByText("맞는 제품을 모아 드려요")).toBeInTheDocument();
  });

  it("등록된 제품·성분·브랜드 수를 기준 달과 함께 보여 준다", () => {
    render(<AboutPage />);

    const stats = screen.getByRole("region", { name: "파우디는 지금" });

    expect(within(stats).getByText("1,240")).toBeInTheDocument();
    expect(within(stats).getByText("22,013")).toBeInTheDocument();
    expect(within(stats).getByText("39")).toBeInTheDocument();
    expect(within(stats).getByText(/2026년 10월 기준/)).toBeInTheDocument();
  });

  it("사용법 세 단계를 화면 캡처와 함께 순서대로 보여 준다", () => {
    render(<AboutPage />);

    for (const step of [1, 2, 3]) {
      expect(screen.getByText(`사용법 ${step}`)).toBeInTheDocument();
    }
    expect(screen.getByRole("img", { name: /탐색 조건 화면/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /조건 일치 제품 화면/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /주의 성분 확인/ })).toBeInTheDocument();
  });

  it("바로 써 볼 수 있도록 홈과 로그인으로 이어 준다", () => {
    render(<AboutPage />);

    const start = screen.getByRole("region", { name: "지금 바로 써 보세요" });

    expect(within(start).getByRole("link", { name: "바로 둘러보기" })).toHaveAttribute("href", "/");
    expect(within(start).getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
  });

  it("푸터에서 지금 보고 있는 서비스 소개를 짚어 준다", () => {
    render(<AboutPage />);

    expect(screen.getByRole("link", { name: "서비스 소개" })).toHaveAttribute("aria-current", "page");
  });
});
