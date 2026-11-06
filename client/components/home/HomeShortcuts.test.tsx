/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HomeShortcuts } from "./HomeShortcuts";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const items = [
  { code: "DRY", name: "건성" },
  { code: "OILY", name: "지성" },
  { code: "COMBINATION", name: "복합성" },
] as const;

describe("HomeShortcuts", () => {
  it("고른 피부 타입을 조건으로 걸어 목록으로 보낸다", () => {
    render(<HomeShortcuts items={items} />);

    expect(screen.getByRole("link", { name: "건성템" })).toHaveAttribute("href", "/products?skinType=DRY");
    expect(screen.getByRole("link", { name: "복합성템" })).toHaveAttribute("href", "/products?skinType=COMBINATION");
  });

  it("유사템찾기를 맨 앞에 두고, 민감성은 피부 타입 끝에 두어 민감성 조건으로 보낸다", () => {
    render(<HomeShortcuts items={items} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "유사템찾기",
      "건성템",
      "지성템",
      "복합성템",
      "민감성템",
    ]);
    expect(screen.getByRole("link", { name: "민감성템" })).toHaveAttribute("href", "/products?sensitiveSkin=true");
  });

  it("피부 타입 선택을 탐색 시작으로 남긴다", async () => {
    render(<HomeShortcuts items={items} />);

    await userEvent.click(screen.getByRole("link", { name: "건성템" }));

    expect(track).toHaveBeenCalledWith("skin_type_selected", { skin_type: "DRY" });
  });

  it("타일 그림은 아래 글자가 뜻을 전하므로 보조 기술에서 감춘다", () => {
    const { container } = render(<HomeShortcuts items={items} />);

    // alt 가 비어 있으면 그림 역할을 잃어 낭독기가 건너뛴다. 이름이 두 번 읽히지 않는다.
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(items.length + 2);
  });

  it("유사템찾기로 보내고 선택을 남긴다", async () => {
    render(<HomeShortcuts items={items} />);

    const link = screen.getByRole("link", { name: "유사템찾기" });
    expect(link).toHaveAttribute("href", "/similar-products");

    await userEvent.click(link);

    expect(track).toHaveBeenCalledWith("home_shortcut_selected", { shortcut: "similar_products" });
  });

  it("피부 타입이 비면 유사템찾기만 남긴다", () => {
    render(<HomeShortcuts items={[]} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["유사템찾기"]);
  });
});
