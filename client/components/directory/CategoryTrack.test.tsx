/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RevealingCategoryTrack } from "./CategoryTrack";

describe("카테고리 상세 선택 줄", () => {
  it("필터 칩 위에서 접혔다 펼쳐질 sticky 줄로 그린다", () => {
    const { container } = render(
      <RevealingCategoryTrack
        items={[
          { id: 1, name: "전체" },
          { id: 2, name: "스킨토너" },
          { id: 3, name: "에센스" },
        ]}
        selectedId={2}
      />,
    );

    const track = container.querySelector(".category-track-bar");
    expect(track).toHaveClass("sticky");
    expect(track).not.toHaveClass("stuck-edge");
    expect(track).not.toHaveAttribute("data-stuck");
    expect(track).toHaveAttribute("data-hidden", "false");
    expect(screen.getByRole("link", { name: "스킨토너" })).toHaveAttribute("aria-current", "page");
  });
});
