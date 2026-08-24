/**
 * @vitest-environment jsdom
 */
import type { BrandResponse } from "@poudy/api/api.zod";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BrandOptions } from "./BrandOptions";

const brand = (id: number, name: string): BrandResponse => ({
  id,
  name,
  englishName: null,
  imageUrl: null,
});

const brands = [brand(1, "라운드랩"), brand(2, "토리든")];

const row = (name: string) => {
  const found = screen.getByText(name).closest("li");
  if (!found) throw new Error(`${name} 행을 찾지 못했습니다`);
  return within(found);
};

describe("BrandOptions", () => {
  it("고른 브랜드만 눌린 상태로 보여 준다", () => {
    render(<BrandOptions brands={brands} selectedIds={[2]} onToggle={vi.fn()} />);

    expect(row("라운드랩").getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
    expect(row("토리든").getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  it("브랜드를 누르면 그 브랜드만 알린다", async () => {
    const onToggle = vi.fn();
    render(<BrandOptions brands={brands} selectedIds={[]} onToggle={onToggle} />);

    await userEvent.click(row("토리든").getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it("검색하면 이름이 맞는 브랜드만 남는다", async () => {
    render(<BrandOptions brands={brands} selectedIds={[]} onToggle={vi.fn()} />);

    await userEvent.type(screen.getByRole("searchbox"), "토리");

    expect(screen.getByText("토리든")).toBeInTheDocument();
    expect(screen.queryByText("라운드랩")).not.toBeInTheDocument();
  });

  it("영문명이 없으면 null 문자열로 검색되지 않는다", async () => {
    render(<BrandOptions brands={brands} selectedIds={[]} onToggle={vi.fn()} />);

    await userEvent.type(screen.getByRole("searchbox"), "null");

    expect(screen.getByText("찾는 브랜드가 없어요.")).toBeInTheDocument();
  });
});
