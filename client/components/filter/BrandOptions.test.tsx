/**
 * @vitest-environment jsdom
 */
import type { BrandResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
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

describe("BrandOptions", () => {
  it("고른 브랜드만 눌린 상태로 보여 준다", () => {
    render(<BrandOptions brands={brands} selectedIds={[2]} onChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "라운드랩" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "토리든" })).toBeChecked();
    expect(screen.getByText("1개 선택")).toBeInTheDocument();
  });

  it("브랜드를 누르면 고른 브랜드 목록을 알린다", async () => {
    const onChange = vi.fn();
    render(<BrandOptions brands={brands} selectedIds={[1]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "토리든" }));

    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it("검색하면 이름이 맞는 브랜드만 남는다", async () => {
    render(<BrandOptions brands={brands} selectedIds={[]} onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("searchbox"), "토리");

    expect(screen.getByText("토리든")).toBeInTheDocument();
    expect(screen.queryByText("라운드랩")).not.toBeInTheDocument();
  });

  it("영문명이 없으면 null 문자열로 검색되지 않는다", async () => {
    render(<BrandOptions brands={brands} selectedIds={[]} onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("searchbox"), "null");

    expect(screen.getByText("찾는 브랜드가 없어요.")).toBeInTheDocument();
  });
});
