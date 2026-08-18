/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterChip } from "./FilterChip";
import { SearchField } from "./SearchField";
import { SortDropdown } from "./SortDropdown";

describe("SearchField", () => {
  it("입력이 없으면 지우기 버튼을 숨긴다", () => {
    render(<SearchField value="" onChange={() => {}} placeholder="검색" label="제품 검색" />);

    expect(screen.queryByRole("button", { name: "검색어 지우기" })).not.toBeInTheDocument();
  });

  it("입력이 있으면 지우기 버튼을 보여 준다", () => {
    render(<SearchField value="독도" onChange={() => {}} placeholder="검색" label="제품 검색" />);

    expect(screen.getByRole("button", { name: "검색어 지우기" })).toBeInTheDocument();
  });

  it("지우기를 누르면 빈 값을 넘긴다", async () => {
    const onChange = vi.fn();
    render(<SearchField value="독도" onChange={onChange} placeholder="검색" label="제품 검색" />);

    await userEvent.click(screen.getByRole("button", { name: "검색어 지우기" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("입력한 값을 넘긴다", async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="검색" label="제품 검색" />);

    await userEvent.type(screen.getByRole("searchbox", { name: "제품 검색" }), "토");

    expect(onChange).toHaveBeenCalledWith("토");
  });
});

describe("FilterChip", () => {
  it("조건이 걸리면 눌린 상태로 표시한다", () => {
    render(<FilterChip label="브랜드" selected />);

    expect(screen.getByRole("button", { name: "브랜드" })).toHaveAttribute("aria-pressed", "true");
  });

  it("조건이 없으면 눌리지 않은 상태다", () => {
    render(<FilterChip label="브랜드" />);

    expect(screen.getByRole("button", { name: "브랜드" })).toHaveAttribute("aria-pressed", "false");
  });

  it("디자인대로 라벨만 보여 준다. 개수는 붙이지 않는다", () => {
    render(<FilterChip label="브랜드" selected />);

    expect(screen.getByRole("button", { name: "브랜드" }).textContent?.trim()).toBe("브랜드");
  });
});

describe("SortDropdown", () => {
  it("현재 정렬 기준을 보여 준다", () => {
    render(<SortDropdown value="PRICE_ASC" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: /가격 낮은순/ })).toBeInTheDocument();
  });

  it("열면 정렬 4 종을 보여 준다", async () => {
    render(<SortDropdown value="NAME_ASC" onChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /제품명 오름차순/ }));

    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("고른 정렬을 넘기고 닫는다", async () => {
    const onChange = vi.fn();
    render(<SortDropdown value="NAME_ASC" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /제품명 오름차순/ }));
    await userEvent.click(screen.getByRole("option", { name: "가격 높은순" }));

    expect(onChange).toHaveBeenCalledWith("PRICE_DESC");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
