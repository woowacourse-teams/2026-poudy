/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterChip } from "./FilterChip";
import { SEARCH_KEYWORD_MAX_LENGTH, SearchField } from "./SearchField";
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

  it("검색어를 최대 100 자까지만 입력받는다", () => {
    render(<SearchField value="" onChange={() => {}} placeholder="검색" label="제품 검색" />);

    expect(screen.getByRole("searchbox", { name: "제품 검색" })).toHaveAttribute(
      "maxlength",
      String(SEARCH_KEYWORD_MAX_LENGTH),
    );
  });

  it("iOS Safari 가 화면을 키우지 않게 하는 규칙을 입력에 건다", () => {
    render(<SearchField value="" onChange={() => {}} placeholder="검색" label="제품 검색" />);

    /*
     * `.search-field-input` 은 font-size 를 16px 로 두고 scale 로 보이는 크기만
     * 14px 로 줄인다. 이 클래스를 떼거나 규칙에서 font-size 를 내리면 #219 가
     * 되살아난다. 실제 값은 globals.css 에 있어 jsdom 에서는 읽히지 않으므로
     * 규칙이 걸려 있다는 사실만 확인한다.
     */
    expect(screen.getByRole("searchbox", { name: "제품 검색" })).toHaveClass("search-field-input");
  });

  it("확대를 막는 크기를 Tailwind 클래스로 덮어쓰지 않는다", () => {
    render(<SearchField value="" onChange={() => {}} placeholder="검색" label="제품 검색" />);

    // text-[14px] 같은 값이 붙으면 globals.css 의 16px 를 덮어써 확대가 되살아난다.
    const className = screen.getByRole("searchbox", { name: "제품 검색" }).className;

    expect(className).not.toMatch(/\btext-\[\d+px\]/);
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
