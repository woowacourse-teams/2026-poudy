/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldRule } from "./field-rule";
import { Select } from "./select";
import { TextArea } from "./text-area";
import { TextField } from "./text-field";

const minLength: FieldRule = { validate: (value) => (value.length < 2 ? "2자 이상 적어 주세요." : undefined) };

function ControlledField({ rule, serverError }: { readonly rule?: FieldRule; readonly serverError?: string }) {
  const [value, setValue] = useState("");
  return <TextField label="제품명" value={value} onChange={setValue} rule={rule} serverError={serverError} />;
}

describe("TextField", () => {
  it("라벨과 입력을 잇고, 필수 칸은 aria-required 를, 선택 칸은 '선택' 표시를 둔다", () => {
    render(
      <>
        <TextField label="제품명" value="" onChange={() => undefined} />
        <TextField label="브랜드" value="" onChange={() => undefined} optional />
      </>,
    );

    expect(screen.getByLabelText("제품명")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/브랜드/)).not.toHaveAttribute("aria-required");
    expect(screen.getByText("선택")).toBeInTheDocument();
  });

  it("기본 규칙은 칸을 벗어날 때 처음 검사하고, 그 뒤로는 입력할 때마다 다시 검사한다", () => {
    render(<ControlledField rule={minLength} />);
    const input = screen.getByLabelText("제품명");

    fireEvent.change(input, { target: { value: "a" } });
    expect(input).not.toHaveAttribute("aria-invalid");

    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("2자 이상 적어 주세요.")).toHaveAttribute("id", input.getAttribute("aria-describedby"));

    fireEvent.change(input, { target: { value: "ab" } });
    expect(input).not.toHaveAttribute("aria-invalid");

    fireEvent.change(input, { target: { value: "a" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("손대지 않은 칸은 지나가기만 해서는 검사하지 않는다", () => {
    render(<ControlledField rule={minLength} />);
    const input = screen.getByLabelText("제품명");

    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("서버 오류는 규칙과 상관없이 바로 보여 준다", () => {
    render(<ControlledField serverError="이미 등록된 제품이에요." />);

    expect(screen.getByLabelText("제품명")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("이미 등록된 제품이에요.")).toBeInTheDocument();
  });

  describe("입력이 멈춘 뒤 검사하는 규칙", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("정한 시간만큼 입력이 멈추면 칸을 벗어나지 않아도 오류를 보여 준다", () => {
      render(<ControlledField rule={{ ...minLength, validateOn: "change", debounceMs: 500 }} />);
      const input = screen.getByLabelText("제품명");

      fireEvent.change(input, { target: { value: "a" } });
      act(() => vi.advanceTimersByTime(499));
      expect(input).not.toHaveAttribute("aria-invalid");

      act(() => vi.advanceTimersByTime(1));
      expect(input).toHaveAttribute("aria-invalid", "true");

      // 고치면 기다리지 않고 바로 지운다.
      fireEvent.change(input, { target: { value: "ab" } });
      expect(input).not.toHaveAttribute("aria-invalid");
    });
  });
});

describe("TextArea", () => {
  it("maxLength 를 주면 글자 수를 보여 준다", () => {
    render(<TextArea label="문의 내용" value="안녕하세요" onChange={() => undefined} maxLength={2000} />);

    expect(screen.getByText("5 / 2,000")).toBeInTheDocument();
    expect(screen.getByLabelText("문의 내용")).toHaveAttribute("maxlength", "2000");
  });
});

describe("Select", () => {
  it("시트를 여는 버튼이고, 이름은 라벨과 고른 값을 함께 읽는다", () => {
    const onOpen = vi.fn();
    render(<Select label="브랜드" value="라운드랩" placeholder="선택해 주세요" expanded={false} onOpen={onOpen} />);
    const button = screen.getByRole("button", { name: "브랜드 라운드랩" });

    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
