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
  render(<SortDropdown value="NAME_ASC" onChange={onChange} />);
  return { onChange };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SortDropdown", () => {
  it("메뉴를 열면 선택된 옵션에 초점을 두고 방향키로 옵션을 탐색한다", async () => {
    setup();

    await userEvent.click(screen.getByRole("button", { name: "제품명 오름차순" }));

    expect(screen.getByRole("option", { name: "제품명 오름차순" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "제품명 내림차순" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("option", { name: "가격 낮은순" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("option", { name: "제품명 오름차순" })).toHaveFocus();
  });

  it("바깥을 눌러 닫아도 메뉴를 남겨 닫힘 전환을 보여 준다", async () => {
    setup();
    const trigger = screen.getByRole("button", { name: "제품명 오름차순" });

    await userEvent.click(trigger);
    expect(screen.getByRole("listbox", { name: "정렬 기준" })).toHaveAttribute("aria-hidden", "false");

    await userEvent.click(document.body);

    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("정렬 기준을 고르면 값을 전달하고 메뉴를 닫는다", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "제품명 오름차순" }));

    await userEvent.click(screen.getByRole("option", { name: "가격 낮은순" }));

    expect(onChange).toHaveBeenCalledWith("PRICE_ASC");
    expect(requestSelectionHaptic).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "제품명 오름차순" })).toHaveFocus();
    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("키보드로 정렬 기준을 고르면 값을 전달하고 메뉴를 닫는다", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "제품명 오름차순" }));

    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("NAME_DESC");
    expect(requestSelectionHaptic).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "제품명 오름차순" })).toHaveFocus();
    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("Escape로 닫으면 트리거로 초점을 돌려준다", async () => {
    setup();
    const trigger = screen.getByRole("button", { name: "제품명 오름차순" });
    await userEvent.click(trigger);

    await userEvent.keyboard("{Escape}");

    expect(trigger).toHaveFocus();
    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("Tab으로 메뉴를 벗어나면 메뉴를 닫는다", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "제품명 오름차순" }));

    await userEvent.tab();

    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  it("이미 선택된 정렬 기준을 다시 고르면 값과 햅틱을 요청하지 않는다", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "제품명 오름차순" }));

    await userEvent.click(screen.getByRole("option", { name: "제품명 오름차순" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(requestSelectionHaptic).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "제품명 오름차순" })).toHaveFocus();
    expect(screen.getByRole("listbox", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });
});
