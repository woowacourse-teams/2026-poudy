/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SkinTypeMenu } from "./SkinTypeMenu";

import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const items = [
  { code: "DRY", name: "건성" },
  { code: "OILY", name: "지성" },
  { code: "SENSITIVE", name: "민감성" },
  { code: "COMBINATION", name: "복합성" },
] as const;

describe("SkinTypeMenu", () => {
  it("고른 피부 타입을 조건으로 걸어 목록으로 보낸다", () => {
    render(<SkinTypeMenu items={items} />);

    expect(screen.getByRole("link", { name: "건성" })).toHaveAttribute("href", "/products?skinType=DRY&from=skin_type");
    expect(screen.getByRole("link", { name: "복합성" })).toHaveAttribute(
      "href",
      "/products?skinType=COMBINATION&from=skin_type",
    );
  });

  it("피부 타입 선택을 탐색 시작으로 남긴다", async () => {
    render(<SkinTypeMenu items={items} />);

    await userEvent.click(screen.getByRole("link", { name: "건성" }));

    expect(track).toHaveBeenCalledWith("skin_type_selected", { skin_type: "DRY" });
  });

  it("타일 그림은 옆 글자가 뜻을 전하므로 보조 기술에서 감춘다", () => {
    const { container } = render(<SkinTypeMenu items={items} />);

    // alt 가 비어 있으면 그림 역할을 잃어 낭독기가 건너뛴다. 이름이 두 번 읽히지 않는다.
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(items.length);
  });

  it("피부 타입이 비면 아무것도 그리지 않는다", () => {
    const { container } = render(<SkinTypeMenu items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
