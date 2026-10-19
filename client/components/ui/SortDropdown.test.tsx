/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SortDropdown } from "./SortDropdown";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";

vi.mock("@/lib/interaction/haptic", () => ({ requestSelectionHaptic: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

/* 열고 닫기와 키보드는 디자인 시스템 Dropdown 테스트가 본다. 여기서는 정렬 기준 목록과 햅틱만 본다. */
describe("SortDropdown", () => {
  it("제품 목록의 정렬 5 종을 기준 이름으로 보여 준다", () => {
    render(<SortDropdown value="DEFAULT" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /기본순/ })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { hidden: true }).map((option) => option.textContent)).toEqual([
      "기본순",
      "가격 낮은순",
      "가격 높은순",
      "용량별 가격 낮은순",
      "용량별 가격 높은순",
    ]);
  });

  it("다른 기준을 고르면 값을 넘기고 선택 햅틱을 요청한다", async () => {
    const onChange = vi.fn();
    render(<SortDropdown value="DEFAULT" onChange={onChange} />);

    await userEvent.click(screen.getByRole("option", { name: "가격 낮은순", hidden: true }));

    expect(onChange).toHaveBeenCalledWith("PRICE_ASC");
    expect(requestSelectionHaptic).toHaveBeenCalledOnce();
  });
});
