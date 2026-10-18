/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { HomeTopBar } from "./HomeTopBar";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

it("홈 제목을 화면의 대표 제목으로 둔다", () => {
  render(<HomeTopBar />);

  expect(screen.getByRole("heading", { level: 1, name: "홈" })).toBeInTheDocument();
});

it("홈 검색 링크가 검색 화면 이동 의도를 남긴다", async () => {
  render(<HomeTopBar />);

  const link = screen.getByRole("link", { name: "검색" });
  expect(link).toHaveAttribute("href", "/search/products");

  await userEvent.click(link);
  expect(track).toHaveBeenCalledWith("home_search_selected", { placement: "top_bar" });
});
