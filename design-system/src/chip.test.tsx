/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterChip, FilterResetChip, FilterToggleChip } from "./filter-chip";
import { ToggleChip, ToggleGroup } from "./toggle-chip";

describe("FilterChip", () => {
  it("시트를 여는 버튼이고, 값이 있으면 이름 자리에 값을 쓰되 '조건, 값'으로 읽는다", () => {
    const onOpen = vi.fn();
    const { rerender } = render(<FilterChip label="피부 타입" expanded={false} onOpen={onOpen} />);
    const chip = screen.getByRole("button", { name: "피부 타입" });

    expect(chip).toHaveAttribute("aria-haspopup", "dialog");
    expect(chip).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(chip);
    expect(onOpen).toHaveBeenCalledOnce();

    rerender(<FilterChip label="피부 타입" value="건성" expanded={false} onOpen={onOpen} />);
    expect(screen.getByRole("button", { name: "피부 타입, 건성" })).toHaveTextContent("건성");
  });
});

describe("FilterToggleChip", () => {
  it("켜면 분홍 면 위라 hover · 눌림을 같은 계열 한 단계 진한 면(fb-tint-brand)으로 칠한다(S03)", () => {
    const { rerender } = render(<FilterToggleChip label="나만의 필터" icon="user-check" pressed={false} onPress={() => undefined} />);
    const chip = screen.getByRole("button", { name: "나만의 필터" });
    expect(chip).toHaveClass("fb-surface");

    rerender(<FilterToggleChip label="나만의 필터" icon="user-check" pressed onPress={() => undefined} />);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("fb-tint-brand", "bg-brand-soft");
    expect(chip).not.toHaveClass("fb-dim");
  });
});

describe("FilterResetChip", () => {
  it("무엇을 비우는지 이름으로 읽고, 누르면 onReset 을 부른다", () => {
    const onReset = vi.fn();
    render(<FilterResetChip onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "필터 조건 모두 초기화" }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

describe("필터 칩의 누르는 영역", () => {
  it("테두리 안쪽을 기준으로 7 을 넓혀 44 다(A11Y D12)", () => {
    render(
      <>
        <FilterResetChip onReset={() => undefined} />
        <FilterToggleChip label="나만의 필터" icon="user-check" pressed={false} onPress={() => undefined} />
        <FilterChip label="성분" expanded={false} onOpen={() => undefined} />
      </>,
    );

    screen.getAllByRole("button").forEach((chip) => expect(chip).toHaveClass("after:-inset-y-1.75"));
  });
});

describe("한 줄 고정 높이 부품의 줄 높이", () => {
  it("글자 줄 높이가 1 이다. 행간이 남으면 브라우저가 반올림해 글자가 위로 뜬다(TYPO T04)", () => {
    render(
      <>
        <FilterChip label="성분" expanded={false} onOpen={() => undefined} />
        <ToggleChip pressed={false} onPressedChange={() => undefined}>
          에탄올
        </ToggleChip>
      </>,
    );

    expect(screen.getByRole("button", { name: "성분" })).toHaveClass("leading-none");
    expect(screen.getByRole("button", { name: "에탄올" })).toHaveClass("leading-none");
  });
});

describe("ToggleChip · ToggleGroup", () => {
  it("누르면 켜고 끄며 aria-pressed 로 알리고, 묶음은 이름을 가진다", () => {
    function Sample() {
      const [pressed, setPressed] = useState(false);
      return (
        <ToggleGroup aria-label="피하고 싶은 성분">
          <ToggleChip pressed={pressed} onPressedChange={setPressed}>
            향료/알레르기 성분
          </ToggleChip>
        </ToggleGroup>
      );
    }
    render(<Sample />);
    const chip = screen.getByRole("button", { name: "향료/알레르기 성분" });

    expect(screen.getByRole("group", { name: "피하고 싶은 성분" })).toBeInTheDocument();
    expect(chip).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("누를 때 크기는 바꾸지 않는다. 누르는 순간 선택 모양도 바뀌어 겹치면 움찔해 보인다(S07)", () => {
    render(
      <ToggleChip pressed={false} onPressedChange={() => undefined}>
        에탄올
      </ToggleChip>,
    );

    expect(screen.getByRole("button", { name: "에탄올" })).not.toHaveClass("press-scale");
  });
});
