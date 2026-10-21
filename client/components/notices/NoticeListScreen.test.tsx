// @vitest-environment jsdom
import type { NoticeResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { NoticeListScreen } from "./NoticeListScreen";

import { findNotices } from "@/lib/api/notices";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api/notices", () => ({ findNotices: vi.fn() }));

const notice = (id: string, title: string): NoticeResponse => ({
  id,
  title,
  content: "본문",
  authorName: "관리자",
  status: "PUBLISHED",
  bannerEnabled: false,
  bannerText: null,
  firstPublishedAt: "2026-10-13T09:00:00+09:00",
  viewCount: 0,
  createdAt: "2026-10-13T09:00:00+09:00",
  updatedAt: "2026-10-13T09:00:00+09:00",
  images: [],
});
const page = (items: NoticeResponse[], hasNext = false) => ({
  items,
  pagination: { page: 1, size: 20, totalElements: items.length, totalPages: 1, hasNext },
});

afterEach(() => {
  vi.clearAllMocks();
});

it("행 전체를 공지 상세 링크로 그리고 공개일을 YYYY.MM.DD 로 적는다", async () => {
  vi.mocked(findNotices).mockResolvedValue(page([notice("a", "선반 기능이 새로 생겼어요")]));
  render(<NoticeListScreen />);
  const link = await screen.findByRole("link", { name: /선반 기능이 새로 생겼어요/ });
  expect(link).toHaveAttribute("href", "/notices/a");
  expect(screen.getByText("2026.10.13").tagName).toBe("TIME");
  expect(screen.queryByRole("button", { name: "다음" })).not.toBeInTheDocument();
});

it("공지가 없으면 빈 상태를 보여 준다", async () => {
  vi.mocked(findNotices).mockResolvedValue(page([]));
  render(<NoticeListScreen />);
  expect(await screen.findByText("아직 공지사항이 없어요")).toBeInTheDocument();
  expect(screen.getByText("새 소식이 생기면 여기에서 알려 드릴게요")).toBeInTheDocument();
});
