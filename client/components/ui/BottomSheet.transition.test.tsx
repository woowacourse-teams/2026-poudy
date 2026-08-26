/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

const props = () => ({
  title: "카테고리",
  submitLabel: "3개 제품 보기",
  onClose: vi.fn(),
  onSubmit: vi.fn(),
});

const sheet = () => screen.queryByRole("dialog");
const dim = () => document.querySelector(".bottom-sheet-dim") as HTMLElement | null;

afterEach(() => {
  document.documentElement.style.overflow = "";
  document.documentElement.style.paddingRight = "";
});

describe("BottomSheet 전환", () => {
  it("닫으라고 해도 나가는 전환이 끝날 때까지 남는다", () => {
    const { rerender } = render(
      <BottomSheet open {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );
    expect(sheet()).toBeInTheDocument();

    rerender(
      <BottomSheet open={false} {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );

    expect(sheet()).toBeInTheDocument();
  });

  it("나가는 전환이 끝나면 지운다", () => {
    const { rerender } = render(
      <BottomSheet open {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );

    rerender(
      <BottomSheet open={false} {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );
    fireEvent.transitionEnd(sheet() as HTMLElement);

    expect(sheet()).not.toBeInTheDocument();
  });

  it("안쪽 요소의 전환은 세지 않는다", () => {
    const { rerender } = render(
      <BottomSheet open {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );

    rerender(
      <BottomSheet open={false} {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );
    fireEvent.transitionEnd(screen.getByRole("button", { name: "내용" }));

    expect(sheet()).toBeInTheDocument();
  });

  it("열려 있는 동안 바깥이 스크롤되지 않는다", () => {
    const { rerender } = render(
      <BottomSheet open {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );
    expect(document.documentElement.style.overflow).toBe("hidden");

    rerender(
      <BottomSheet open={false} {...props()}>
        <button type="button">내용</button>
      </BottomSheet>,
    );
    fireEvent.transitionEnd(sheet() as HTMLElement);

    expect(document.documentElement.style.overflow).toBe("");
  });

  it("딤을 누르면 닫으라고 알린다", () => {
    const p = props();
    render(
      <BottomSheet open {...p}>
        <button type="button">내용</button>
      </BottomSheet>,
    );

    fireEvent.click(dim() as HTMLElement);

    expect(p.onClose).toHaveBeenCalled();
  });
});
