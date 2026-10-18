/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryTabs } from "./category-tabs";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const items = [
  { id: 1, name: "전체" },
  { id: 2, name: "스킨/토너" },
  { id: 3, name: "크림" },
];

describe("카테고리 탭", () => {
  beforeEach(() => vi.mocked(track).mockReset());

  it("탭마다 그 카테고리 화면으로 가는 링크를 두고 지금 카테고리를 고른 탭으로 둔다", () => {
    render(
      <CategoryTabs items={items} selectedId={2}>
        <p>목록</p>
      </CategoryTabs>,
    );

    expect(screen.getByRole("tablist", { name: "같은 분류의 카테고리" })).toBeInTheDocument();
    const selected = screen.getByRole("tab", { name: "스킨/토너" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(selected).toHaveAttribute("href", "/categories/2");
    expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute("href", "/categories/1");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("목록");
  });

  it("다른 카테고리 탭을 누르면 카테고리 선택을 남긴다", async () => {
    render(
      <CategoryTabs items={items} selectedId={2}>
        <p>목록</p>
      </CategoryTabs>,
    );

    await userEvent.click(screen.getByRole("tab", { name: "크림" }));

    expect(track).toHaveBeenCalledWith("category_selected", {
      category_id: 3,
      category_name: "크림",
      origin_surface: "category",
    });
  });
});
