/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { HomeSearchLink } from "./HomeSearchLink";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

it("홈 검색 버튼이 검색 화면 이동 의도를 남긴다", async () => {
  render(<HomeSearchLink />);

  const link = screen.getByRole("link", { name: "검색" });
  expect(link).toHaveAttribute("href", "/search/products");

  await userEvent.click(link);
  expect(track).toHaveBeenCalledWith("home_search_selected", { placement: "top_bar" });
});
