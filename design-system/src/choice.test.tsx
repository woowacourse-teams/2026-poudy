/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { CheckboxGroup, CheckboxGroupItem } from "./checkbox-group";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup", () => {
  it("라벨을 묶음의 이름으로 잇고, 선택지마다 네이티브 radio 를 둔다", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="성별" variant="choice" value="female" onValueChange={onValueChange}>
        <RadioGroupItem value="female">여성</RadioGroupItem>
        <RadioGroupItem value="male">남성</RadioGroupItem>
      </RadioGroup>,
    );

    const group = screen.getByRole("radiogroup", { name: "성별" });
    expect(group).toHaveAttribute("aria-required", "true");
    expect(screen.getByRole("radio", { name: "여성" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "남성" }));
    expect(onValueChange).toHaveBeenCalledWith("male");
  });

  it("라벨을 그리지 않는 목록은 aria-label 로 이름을 받는다", () => {
    render(
      <RadioGroup aria-label="소분류" variant="list" value={undefined} onValueChange={() => undefined}>
        <RadioGroupItem value="all">전체</RadioGroupItem>
      </RadioGroup>,
    );

    expect(screen.getByRole("radiogroup", { name: "소분류" })).toBeInTheDocument();
  });

  it("이름 없이는 그릴 수 없다: 라벨이 없으면 aria-labelledby 나 aria-label 을 반드시 받는다", () => {
    const items = <RadioGroupItem value="all">전체</RadioGroupItem>;
    render(
      <>
        <h2 id="sheet-title">카테고리</h2>
        <RadioGroup aria-labelledby="sheet-title" variant="list" value={undefined} onValueChange={() => undefined}>
          {items}
        </RadioGroup>
        <CheckboxGroup aria-labelledby="sheet-title" value={[]} onValueChange={() => undefined}>
          <CheckboxGroupItem value="a">A</CheckboxGroupItem>
        </CheckboxGroup>
      </>,
    );
    expect(screen.getByRole("radiogroup", { name: "카테고리" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "카테고리" })).toBeInTheDocument();

    void (
      (
        // @ts-expect-error 이름이 없는 묶음
        <RadioGroup variant="list" value={undefined} onValueChange={() => undefined}>
          {items}
        </RadioGroup>
      )
    );
    void (
      (
        // @ts-expect-error 이름이 없는 묶음
        <CheckboxGroup value={[]} onValueChange={() => undefined}>
          {items}
        </CheckboxGroup>
      )
    );
  });

  it("선택 버튼과 선택 카드는 누를 때 크기를 바꾸지 않는다(S07)", () => {
    render(
      <>
        <RadioGroup aria-label="성별" variant="choice" value={undefined} onValueChange={() => undefined}>
          <RadioGroupItem value="female">여성</RadioGroupItem>
        </RadioGroup>
        <RadioGroup aria-label="피부 타입" variant="card" value={undefined} onValueChange={() => undefined}>
          <RadioGroupItem value="dry">건성</RadioGroupItem>
        </RadioGroup>
      </>,
    );

    expect(screen.getByText("여성").closest("label")).not.toHaveClass("press-scale");
    expect(screen.getByText("건성").closest("label")).not.toHaveClass("press-scale");
  });

  it("막힌 선택지는 고를 수 없다", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="소분류" variant="list" value="all" onValueChange={onValueChange}>
        <RadioGroupItem value="all">전체</RadioGroupItem>
        <RadioGroupItem value="cream" disabled>
          크림
        </RadioGroupItem>
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "크림" })).toBeDisabled();
  });
});

describe("CheckboxGroup", () => {
  it("행을 누르면 값을 켜고 끄고, 새로 고른 값은 끝에 붙는다", () => {
    function Sample() {
      const [value, setValue] = useState<readonly string[]>(["a"]);
      return (
        <>
          <CheckboxGroup label="탈퇴 이유" value={value} onValueChange={setValue}>
            <CheckboxGroupItem value="a">자주 쓰지 않아요</CheckboxGroupItem>
            <CheckboxGroupItem value="b">찾는 제품이 없어요</CheckboxGroupItem>
          </CheckboxGroup>
          <output>{value.join(",")}</output>
        </>
      );
    }
    render(<Sample />);

    expect(screen.getByRole("group", { name: "탈퇴 이유" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "찾는 제품이 없어요" }));
    expect(screen.getByRole("status")).toHaveTextContent("a,b");

    fireEvent.click(screen.getByRole("checkbox", { name: "자주 쓰지 않아요" }));
    expect(screen.getByRole("status")).toHaveTextContent("b");
  });

  it("이미 담긴 항목은 체크된 채 막힌다", () => {
    render(
      <CheckboxGroup aria-label="성분" value={["fragrance"]} onValueChange={() => undefined}>
        <CheckboxGroupItem value="fragrance" description="이미 필터에 있음" disabled>
          향료
        </CheckboxGroupItem>
      </CheckboxGroup>,
    );

    const checkbox = screen.getByRole("checkbox", { name: /향료/ });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });
});
