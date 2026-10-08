/**
 * @vitest-environment jsdom
 */
import type { BrandSummaryResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BrandDirectory } from "./BrandDirectory";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const brand = (id: number, name: string): BrandSummaryResponse => ({
  id,
  name,
  englishName: null,
  imageUrl: null,
  productCount: 10,
});

// 라운드랩(ㄹ), 토리든(ㅌ), 3CE(한글 아님)
const brands = [brand(1, "라운드랩"), brand(2, "토리든"), brand(3, "3CE")];

const railLabels = () => screen.getByRole("navigation", { name: "브랜드 초성" }).querySelectorAll("button");

describe("BrandDirectory", () => {
  beforeEach(() => vi.mocked(track).mockReset());

  it("브랜드를 고르면 그 브랜드와 고른 레일 칸을 남긴다", async () => {
    render(<BrandDirectory brands={brands} />);

    await userEvent.click(screen.getByRole("button", { name: "ㄹ" }));
    await userEvent.click(screen.getByRole("link", { name: /라운드랩/ }));

    expect(track).toHaveBeenCalledWith("brand_selected", { brand_id: 1, brand_name: "라운드랩", index_label: "ㄹ" });
  });

  it("브랜드가 있는 초성만 레일에 둔다", () => {
    render(<BrandDirectory brands={brands} />);

    const labels = [...railLabels()].map((button) => button.textContent);
    expect(labels).toEqual(["전체", "ㄹ", "ㅌ", "A-Z"]);
  });

  it("브랜드가 없는 초성은 눌러 볼 수 없다", () => {
    render(<BrandDirectory brands={brands} />);

    // ㄱ 으로 시작하는 브랜드가 없으므로 레일에 나오지 않는다.
    expect(screen.queryByRole("button", { name: "ㄱ" })).not.toBeInTheDocument();
  });

  it("초성을 고르면 그 브랜드만 남는다", async () => {
    render(<BrandDirectory brands={brands} />);

    await userEvent.click(screen.getByRole("button", { name: "ㄹ" }));

    expect(screen.getByText("라운드랩")).toBeInTheDocument();
    expect(screen.queryByText("토리든")).not.toBeInTheDocument();
    expect(screen.getByText("브랜드 1개")).toBeInTheDocument();
  });

  it("한글로 시작하지 않는 이름은 숫자로 시작해도 A-Z 로 모은다", async () => {
    render(<BrandDirectory brands={[...brands, brand(4, "SK-II")]} />);

    await userEvent.click(screen.getByRole("button", { name: "A-Z" }));

    expect(screen.getByText("3CE")).toBeInTheDocument();
    expect(screen.getByText("SK-II")).toBeInTheDocument();
    expect(screen.queryByText("라운드랩")).not.toBeInTheDocument();
  });

  it("전체는 모든 브랜드를 보여 준다", () => {
    render(<BrandDirectory brands={brands} />);

    expect(screen.getByText("전체 브랜드")).toBeInTheDocument();
    expect(screen.getByText("브랜드 3개")).toBeInTheDocument();
  });

  it("한글 브랜드가 없으면 A-Z 만 남는다", () => {
    render(<BrandDirectory brands={[brand(3, "3CE")]} />);

    const labels = [...railLabels()].map((button) => button.textContent);
    expect(labels).toEqual(["전체", "A-Z"]);
  });
});
