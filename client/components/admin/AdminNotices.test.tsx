// @vitest-environment jsdom
import type { NoticeResponse } from "@poudy/api/api.zod";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { AdminNoticeEditor } from "./AdminNotices";

import { saveNotice } from "@/lib/api/notices";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("./AdminShell", () => ({
  AdminShell: ({ title, children }: { readonly title: ReactNode; readonly children: ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));
vi.mock("@/lib/api/notices", () => ({
  saveNotice: vi.fn(),
  findAdminNotices: vi.fn(),
  findAdminNotice: vi.fn(),
  noticeSummary: vi.fn(),
  deleteNotice: vi.fn(),
  uploadNoticeImages: vi.fn(),
  noticeImageUrl: vi.fn(),
}));
const saved: NoticeResponse = {
  id: "2d55d3ca-e523-4786-825d-9033c70c8d66",
  title: "저장한 공지",
  content: "본문을 저장합니다.",
  authorName: "관리자",
  status: "PRIVATE",
  bannerEnabled: false,
  bannerText: null,
  firstPublishedAt: null,
  viewCount: 0,
  createdAt: "2026-10-21T09:00:00+09:00",
  updatedAt: "2026-10-21T09:00:00+09:00",
  images: [],
};
it("새 공지를 저장한 뒤 경로 이동이 지연되어도 같은 공지를 수정한다", async () => {
  vi.mocked(saveNotice).mockResolvedValue(saved);
  render(<AdminNoticeEditor />);
  fireEvent.change(screen.getByRole("textbox", { name: /^제목/ }), { target: { value: saved.title } });
  fireEvent.change(screen.getByRole("textbox", { name: /^본문/ }), { target: { value: saved.content } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("저장했어요.");
  expect(vi.mocked(saveNotice).mock.calls[0][0]).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(saveNotice).toHaveBeenCalledTimes(2));
  expect(vi.mocked(saveNotice).mock.calls[1][0]).toBe(saved.id);
});
