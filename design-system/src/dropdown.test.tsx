/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Dropdown } from "./dropdown";

const OPTIONS = [
  { value: "A", label: "가나다순" },
  { value: "B", label: "낮은 가격순" },
  { value: "C", label: "높은 가격순" },
] as const;

const setup = () => {
  const onChange = vi.fn();
  render(<Dropdown aria-label="정렬 기준" value="A" options={OPTIONS} onChange={onChange} />);
  return { onChange };
};

/*
 * 목록은 브라우저 popover 로 열고 닫는다. jsdom 에는 popover 가 없어 닫힌 목록을 숨김으로 다루므로 hidden 으로 찾는다.
 * 여기서는 역할·선택·키보드 이동과 고른 뒤의 동작을 보고, 열고 닫기와 자리는 브라우저가 맡는다.
 */
describe("Dropdown", () => {
  it("지금 값의 이름을 보이고, 목록을 여는 버튼으로 이어진다", () => {
    setup();

    const trigger = screen.getByRole("button", { name: /가나다순/ });
    const listbox = screen.getByRole("listbox", { hidden: true });
    expect(listbox).toHaveAttribute("aria-label", "정렬 기준");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", listbox.id);
    expect(trigger).toHaveAttribute("popovertarget", listbox.id);
  });

  it("지금 값만 선택으로 알린다", () => {
    setup();

    const options = screen.getAllByRole("option", { hidden: true });
    expect(options).toHaveLength(3);
    expect(options.filter((option) => option.getAttribute("aria-selected") === "true")).toEqual([
      screen.getByRole("option", { name: "가나다순", hidden: true }),
    ]);
  });

  it("방향키·End 로 옵션 사이를 옮긴다", () => {
    setup();
    const listbox = screen.getByRole("listbox", { hidden: true });
    screen.getByRole("option", { name: "가나다순", hidden: true }).focus();

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "낮은 가격순", hidden: true })).toHaveFocus();
    fireEvent.keyDown(listbox, { key: "End" });
    expect(screen.getByRole("option", { name: "높은 가격순", hidden: true })).toHaveFocus();
  });

  it("다른 값을 고르면 넘기고, 같은 값을 다시 고르면 넘기지 않는다", () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByRole("option", { name: "낮은 가격순", hidden: true }));
    expect(onChange).toHaveBeenCalledWith("B");

    fireEvent.click(screen.getByRole("option", { name: "가나다순", hidden: true }));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
