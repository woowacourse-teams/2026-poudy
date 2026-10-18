/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SortDropdown } from "./SortDropdown";

import { requestSelectionHaptic } from "@/lib/interaction/haptic";

vi.mock("@/lib/interaction/haptic", () => ({ requestSelectionHaptic: vi.fn() }));

const setup = () => {
  const onChange = vi.fn();
  render(<SortDropdown value="DEFAULT" onChange={onChange} />);
  return { onChange };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SortDropdown", () => {
  it("현재 정렬 기준을 보여 주고 시트를 여는 버튼이다", () => {
    setup();

    const trigger = screen.getByRole("button", { name: /기본순/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("열면 정렬 시트에 정렬 5 종을 라디오로 보여 준다", async () => {
    setup();

    await userEvent.click(screen.getByRole("button", { name: /기본순/ }));

    const dialog = await screen.findByRole("dialog", { name: "정렬" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "기본순" })).toBeChecked();
  });

  it("정렬 기준을 고르면 값을 넘기고 시트를 닫는다", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: /기본순/ }));

    await userEvent.click(await screen.findByRole("radio", { name: "가격 낮은순" }));

    expect(onChange).toHaveBeenCalledWith("PRICE_ASC");
    expect(requestSelectionHaptic).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /기본순/ })).toHaveAttribute("aria-expanded", "false"),
    );
  });
});
