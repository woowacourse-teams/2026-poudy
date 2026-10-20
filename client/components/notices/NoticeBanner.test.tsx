// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { NoticeBanner } from "./NoticeBanner";
import { NoticeBody } from "./NoticeBody";

import { findNoticeBanners } from "@/lib/api/notices";

vi.mock("@/lib/api/notices", () => ({ findNoticeBanners: vi.fn(), noticeImageUrl: (id: string) => `/image/${id}` }));
const entries = Array.from({ length: 11 }, (_, i) => ({ id: String(i), text: `공지 ${i + 1}` }));
beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(findNoticeBanners).mockResolvedValue({ items: entries });
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});
afterEach(() => {
  vi.useRealTimers();
});
describe("공지 띠", () => {
  it("최대 10개를 5초마다 교대하고 포커스 중에는 멈춘다", async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<NoticeBanner />);
    });
    expect(screen.getByText("1/10")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("link", { name: "공지 2" })).toBeInTheDocument();
    fireEvent.focus(screen.getByRole("link"));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("link", { name: "공지 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 공지" }));
    expect(screen.getByRole("link", { name: "공지 3" })).toBeInTheDocument();
  });
  it("닫은 탭에서는 다시 띄우지 않는다", async () => {
    const view = render(<NoticeBanner />);
    await screen.findByText("공지 1");
    fireEvent.click(screen.getByRole("button", { name: "공지 알림 닫기" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    view.unmount();
    render(<NoticeBanner />);
    expect(screen.queryByText("공지 1")).not.toBeInTheDocument();
  });
  it("공지 0개면 띠를 그리지 않는다", async () => {
    vi.mocked(findNoticeBanners).mockResolvedValue({ items: [] });
    await act(async () => {
      render(<NoticeBanner />);
    });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
  it("본문 HTML을 실행하지 않고 http/https만 링크로 표시한다", () => {
    render(<NoticeBody content={"<script>alert(1)</script> javascript:alert(1) https://example.com/notice"} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/notice");
    expect(document.querySelector("script")).toBeNull();
  });
});
