/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Combobox, ComboboxGroup, ComboboxInput, ComboboxList, ComboboxOption } from "./combobox";
import { SearchField } from "./search-field";

describe("SearchField", () => {
  it("값이 있을 때만 지우기 버튼이 있고, 누르면 값을 비우고 입력으로 돌아간다", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchField value="" onChange={onChange} label="제품명 검색" placeholder="" />);
    expect(screen.queryByRole("button", { name: "검색어 지우기" })).not.toBeInTheDocument();

    rerender(<SearchField value="독도" onChange={onChange} label="제품명 검색" placeholder="" />);
    fireEvent.click(screen.getByRole("button", { name: "검색어 지우기" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("searchbox", { name: "제품명 검색" })).toHaveFocus();
  });

  it("Enter 로 검색을 보낸다", () => {
    const onSubmit = vi.fn();
    render(
      <SearchField value="독도" onChange={() => undefined} label="제품명 검색" placeholder="" onSubmit={onSubmit} />,
    );

    fireEvent.submit(screen.getByRole("search"));

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe("Combobox", () => {
  const ITEMS = ["독도 토너", "독도 로션", "독도 클렌저"];

  function Sample({ onSelect, onSubmit, onSearch }: Record<string, (value?: string) => void>) {
    const [value, setValue] = useState("");
    return (
      <Combobox
        value={value}
        onChange={setValue}
        open={value.length > 0}
        onSearch={onSearch}
        status={value ? `${value} 결과 ${ITEMS.length}개` : undefined}
      >
        <ComboboxInput label="제품명 검색" placeholder="" onSubmit={() => onSubmit?.()} />
        <p>입력과 목록 사이의 다른 요소</p>
        <ComboboxList label="제품 자동완성">
          <ComboboxGroup label={<span>제품 바로가기</span>}>
            {ITEMS.map((name) => (
              <ComboboxOption key={name} onSelect={() => onSelect?.(name)}>
                {name}
              </ComboboxOption>
            ))}
          </ComboboxGroup>
        </ComboboxList>
      </Combobox>
    );
  }

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("↓·↑ 로 후보를 가리키되 포커스는 입력에 두고, Enter 로 가리킨 후보를 고른다", () => {
    const onSelect = vi.fn();
    const onSubmit = vi.fn();
    render(<Sample onSelect={onSelect} onSubmit={onSubmit} />);
    const input = screen.getByRole("combobox", { name: "제품명 검색" });

    input.focus();
    fireEvent.change(input, { target: { value: "독도" } });
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const active = screen.getByRole("option", { name: "독도 로션" });
    expect(input).toHaveAttribute("aria-activedescendant", active.id);
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("독도 로션");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("첫 후보에서 ↑ 를 누르면 입력으로 돌아오고, 그때 Enter 는 검색을 보낸다", () => {
    const onSelect = vi.fn();
    const onSubmit = vi.fn();
    render(<Sample onSelect={onSelect} onSubmit={onSubmit} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "독도" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).not.toHaveAttribute("aria-activedescendant");

    fireEvent.submit(screen.getByRole("search"));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Esc 로 목록을 닫고, 다시 입력하면 연다", () => {
    render(<Sample />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "독도" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("listbox", { hidden: true })).not.toBeVisible();

    fireEvent.change(input, { target: { value: "독도 " } });
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("떨어져 있는 입력과 목록을 잇고, 묶음 머리는 묶음의 이름이 되며 키보드 이동에서 건너뛴다", () => {
    render(<Sample />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "독도" } });
    const list = screen.getByRole("listbox", { name: "제품 자동완성" });
    expect(input).toHaveAttribute("aria-controls", list.id);
    expect(screen.getByRole("group", { name: "제품 바로가기" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "독도 토너" }).id);
  });

  it("묶음이 여러 개면 묶음마다 이름을 따로 잇고, ↓ 는 머리를 건너뛰어 다음 묶음의 첫 후보로 간다", () => {
    function TwoGroups() {
      const [value, setValue] = useState("");
      return (
        <Combobox value={value} onChange={setValue} open={value.length > 0}>
          <ComboboxInput label="성분 검색" placeholder="" />
          <ComboboxList label="성분 자동완성">
            <ComboboxGroup label="성분군">
              <ComboboxOption onSelect={() => undefined}>판테놀류</ComboboxOption>
            </ComboboxGroup>
            <ComboboxGroup label="성분">
              <ComboboxOption onSelect={() => undefined}>판테놀</ComboboxOption>
              <ComboboxOption onSelect={() => undefined}>판토텐산</ComboboxOption>
            </ComboboxGroup>
          </ComboboxList>
        </Combobox>
      );
    }
    render(<TwoGroups />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "판" } });
    expect(screen.getByRole("group", { name: "성분군" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "성분" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "판테놀" }).id);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "판테놀류" }).id);
  });

  describe("시간", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("입력이 300ms 멈추면 검색하고, 500ms 멈추면 결과 수를 한 번 알린다", () => {
      const onSearch = vi.fn();
      render(<Sample onSearch={onSearch} />);
      const input = screen.getByRole("combobox");

      fireEvent.change(input, { target: { value: "독" } });
      act(() => vi.advanceTimersByTime(200));
      fireEvent.change(input, { target: { value: "독도" } });
      act(() => vi.advanceTimersByTime(299));
      expect(onSearch).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1));
      expect(onSearch).toHaveBeenCalledExactlyOnceWith("독도");
      expect(screen.getByRole("status")).toHaveTextContent("");

      act(() => vi.advanceTimersByTime(200));
      expect(screen.getByRole("status")).toHaveTextContent("독도 결과 3개");
    });
  });
});
