/**
 * @vitest-environment jsdom
 */
import type { CategoryResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CategoryDirectory } from "./CategoryDirectory";

const categories: readonly CategoryResponse[] = [
  { id: 1, name: "스킨케어", productCount: 30, children: [{ id: 2, name: "스킨/토너", productCount: 10 }] },
  { id: 6, name: "마스크팩", productCount: 5, children: [{ id: 7, name: "시트팩", productCount: 5 }] },
] as unknown as readonly CategoryResponse[];

describe("CategoryDirectory", () => {
  it("고르지 않은 대분류의 소분류 링크도 문서에 그려 두고 감춘다", () => {
    const { container } = render(<CategoryDirectory categories={categories} />);

    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/categories/1", "/categories/2", "/categories/6", "/categories/7"]);

    expect(screen.getByRole("heading", { name: "스킨케어" })).toBeVisible();
    expect(screen.getByRole("link", { name: /스킨\/토너/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /시트팩/ })).not.toBeInTheDocument();
  });

  it("대분류를 고르면 그 대분류의 소분류만 보인다", async () => {
    render(<CategoryDirectory categories={categories} />);

    await userEvent.click(screen.getByRole("button", { name: "마스크팩" }));

    expect(screen.getByRole("heading", { name: "마스크팩" })).toBeVisible();
    expect(screen.getByRole("link", { name: /시트팩/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /스킨\/토너/ })).not.toBeInTheDocument();
  });
});
