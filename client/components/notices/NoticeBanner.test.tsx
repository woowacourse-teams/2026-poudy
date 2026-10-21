// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { NoticeBanner } from "./NoticeBanner";
import { NoticeBody } from "./NoticeBody";

import { findNoticeBanners } from "@/lib/api/notices";

vi.mock("@/lib/api/notices", () => ({ findNoticeBanners: vi.fn(), noticeImageUrl: (id: string) => `/image/${id}` }));
const entries = Array.from({ length: 11 }, (_, i) => ({ id: String(i), text: `공지 ${i + 1}` }));
beforeEach(() => {
  localStorage.clear();
  vi.mocked(findNoticeBanners).mockResolvedValue({ items: entries });
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});
afterEach(() => {
  vi.useRealTimers();
});
describe("공지 띠", () => {
  it("최대 10개를 3초마다 넘기고, 포커스나 포인터가 있거나 화면이 숨겨지면 멈춘다", async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<NoticeBanner />);
    });
    expect(screen.getByRole("region", { name: "공지 알림, 10개" })).toBeInTheDocument();
    expect(screen.queryByText("1/10")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다음 공지" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("link", { name: "공지 2" })).toHaveAttribute("href", "/notices/1");
    fireEvent.focus(screen.getByRole("link"));
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.getByRole("link", { name: "공지 2" })).toBeInTheDocument();
    fireEvent.blur(screen.getByRole("link"), { relatedTarget: null });
    fireEvent.pointerEnter(screen.getByRole("region").parentElement!);
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.getByRole("link", { name: "공지 2" })).toBeInTheDocument();
    fireEvent.pointerLeave(screen.getByRole("region").parentElement!);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.getByRole("link", { name: "공지 2" })).toBeInTheDocument();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("link", { name: "공지 3" })).toBeInTheDocument();
  });
  it("닫으면 돌던 공지를 기억해 다시 띄우지 않고, 새 공지가 생기면 다시 띄운다", async () => {
    const view = render(<NoticeBanner />);
    await screen.findByText("공지 1");
    fireEvent.click(screen.getByRole("button", { name: "공지 알림 닫기" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    view.unmount();
    const again = render(<NoticeBanner />);
    await act(async () => {});
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    again.unmount();
    vi.mocked(findNoticeBanners).mockResolvedValue({ items: [{ id: "new", text: "새 공지" }, ...entries] });
    render(<NoticeBanner />);
    expect(await screen.findByText("새 공지")).toBeInTheDocument();
  });
  it("공지 0개면 띠를 그리지 않고 1개면 개수 없이 알린다", async () => {
    vi.mocked(findNoticeBanners).mockResolvedValue({ items: [] });
    const view = render(<NoticeBanner />);
    await act(async () => {});
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    view.unmount();
    vi.mocked(findNoticeBanners).mockResolvedValue({ items: entries.slice(0, 1) });
    await act(async () => {
      render(<NoticeBanner />);
    });
    expect(screen.getByRole("region", { name: "공지 알림" })).toBeInTheDocument();
  });
  it("본문 HTML을 실행하지 않고 http/https만 링크로 표시한다", () => {
    render(<NoticeBody content={"<script>alert(1)</script> javascript:alert(1) https://example.com/notice"} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/notice");
    expect(document.querySelector("script")).toBeNull();
  });
});
