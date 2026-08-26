/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  it("조건이 없으면 숫자를 그리지 않는다", () => {
    render(<FilterChip label="성분" count={0} />);

    expect(screen.getByRole("button", { name: "성분" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText(/개 선택됨/)).not.toBeInTheDocument();
  });

  it("조건이 걸리면 개수를 함께 알린다", () => {
    render(<FilterChip label="성분" count={14} selected />);

    expect(screen.getByRole("button", { name: /성분/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("14개 선택됨")).toBeInTheDocument();
  });

  it("누르면 시트를 여는 쪽에 알린다", async () => {
    const onClick = vi.fn();
    render(<FilterChip label="브랜드" count={0} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "브랜드" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
