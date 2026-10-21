// @vitest-environment jsdom
import type { NoticeResponse } from "@poudy/api/api.zod";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { NoticeDetailScreen } from "./NoticeDetailScreen";

import { findNotice, recordNoticeView } from "@/lib/api/notices";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api/notices", () => ({
  findNotice: vi.fn(),
  recordNoticeView: vi.fn().mockResolvedValue(undefined),
  findNotices: vi.fn(),
  noticeImageUrl: vi.fn(),
}));
const notice: NoticeResponse = {
  id: "2d55d3ca-e523-4786-825d-9033c70c8d66",
  title: "조회수 검증 공지",
  content: "사용자 상세 본문",
  authorName: "관리자",
  status: "PUBLISHED",
  bannerEnabled: false,
  bannerText: null,
  firstPublishedAt: "2026-10-21T09:00:00+09:00",
  viewCount: 0,
  createdAt: "2026-10-21T09:00:00+09:00",
  updatedAt: "2026-10-21T09:00:00+09:00",
  images: [],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("StrictMode 재실행으로 중복 집계하지 않고 다시 진입하면 집계한다", async () => {
  vi.mocked(findNotice).mockResolvedValue(notice);
  render(
    <StrictMode>
      <NoticeDetailScreen id={notice.id} />
    </StrictMode>,
  );
  await screen.findByRole("heading", { name: notice.title });
  expect(recordNoticeView).toHaveBeenCalledTimes(1);
  cleanup();
  render(
    <StrictMode>
      <NoticeDetailScreen id={notice.id} />
    </StrictMode>,
  );
  await screen.findByRole("heading", { name: notice.title });
  expect(recordNoticeView).toHaveBeenCalledTimes(2);
});
it("비공개 공지의 오류 뒤 다른 공개 공지로 이동하면 정상 내용을 표시한다", async () => {
  vi.mocked(findNotice).mockRejectedValueOnce(new Error("404"));
  const view = render(<NoticeDetailScreen id="hidden" />);
  await screen.findByText("공지를 불러오지 못했어요");
  vi.mocked(findNotice).mockResolvedValueOnce(notice);
  view.rerender(<NoticeDetailScreen id={notice.id} />);
  await screen.findByRole("heading", { name: notice.title });
  await waitFor(() => expect(screen.queryByText("공지를 불러오지 못했어요")).toBeNull());
});
it("제목 · 공개일 · 내용 아래에 목록 보기를 둔다", async () => {
  vi.mocked(findNotice).mockResolvedValue(notice);
  render(<NoticeDetailScreen id={notice.id} />);
  await screen.findByRole("heading", { level: 2, name: notice.title });
  expect(screen.getByRole("heading", { level: 1, name: "공지사항" })).toBeInTheDocument();
  expect(screen.getByText("2026.10.21")).toHaveAttribute("datetime", notice.firstPublishedAt);
  expect(screen.getByRole("button", { name: "목록 보기" })).toBeInTheDocument();
});
