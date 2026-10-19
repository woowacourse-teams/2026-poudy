/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
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

/*
 * 목록은 브라우저 popover 로 열고 닫는다. jsdom 에는 popover 가 없어 목록이 늘 DOM 에 있으므로, 여기서는 옵션의 역할·선택·
 * 키보드 이동과 고른 뒤의 동작을 본다. 열고 닫기와 자리는 브라우저가 맡는다.
 */
describe("SortDropdown", () => {
  it("현재 정렬 기준을 보여 주고 목록을 여는 버튼이다", () => {
    setup();

    const trigger = screen.getByRole("button", { name: /기본순/ });
    const listbox = screen.getByRole("listbox", { hidden: true });
    expect(listbox).toHaveAttribute("aria-label", "정렬 기준");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", listbox.id);
    expect(trigger).toHaveAttribute("popovertarget", listbox.id);
  });

  it("정렬 5 종을 옵션으로 두고 지금 기준만 선택으로 알린다", () => {
    setup();

    const options = screen.getAllByRole("option", { hidden: true });
    expect(options).toHaveLength(5);
    expect(screen.getByRole("option", { name: "기본순", hidden: true })).toHaveAttribute("aria-selected", "true");
    expect(options.filter((option) => option.getAttribute("aria-selected") === "true")).toHaveLength(1);
  });

  it("방향키로 옵션 사이를 옮긴다", async () => {
    setup();
    screen.getByRole("option", { name: "기본순", hidden: true }).focus();

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "가격 낮은순", hidden: true })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("option", { name: "용량별 가격 높은순", hidden: true })).toHaveFocus();
  });

  it("다른 기준을 고르면 값을 넘기고, 같은 기준을 다시 고르면 넘기지 않는다", async () => {
    const { onChange } = setup();

    await userEvent.click(screen.getByRole("option", { name: "가격 낮은순", hidden: true }));
    expect(onChange).toHaveBeenCalledWith("PRICE_ASC");
    expect(requestSelectionHaptic).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("option", { name: "기본순", hidden: true }));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
