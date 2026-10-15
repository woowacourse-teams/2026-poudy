/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Badge } from "./badge";
import { shortenName, Tag } from "./tag";

describe("Tag", () => {
  it("'/'가 들어간 이름은 첫 '/'까지 보이고 나머지는 '…'로 줄인다", () => {
    expect(shortenName("비스-베헤닐/아이소스테아릴/피토스테릴")).toBe("비스-베헤닐/…");
    expect(shortenName("향료/알레르기 성분")).toBe("향료/…");
    expect(shortenName("나이아신아마이드")).toBe("나이아신아마이드");
  });

  it("줄인 칩도 전체 이름을 읽고, 빼기 버튼은 '{이름} 빼기'다", () => {
    const onRemove = vi.fn();
    render(
      <Tag variant="item" onRemove={onRemove}>
        향료/알레르기 성분
      </Tag>,
    );

    expect(screen.getByText("향료/…")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("향료/알레르기 성분")).toHaveClass("sr-only");
    fireEvent.click(screen.getByRole("button", { name: "향료/알레르기 성분 빼기" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("빼기 ✕ 의 포커스 링은 누르는 영역이 아니라 보이는 원에 그린다(S06)", () => {
    render(
      <Tag variant="item" onRemove={() => undefined}>
        판테놀
      </Tag>,
    );

    const button = screen.getByRole("button", { name: "판테놀 빼기" });
    expect(button.querySelector(":scope > [data-focus-ring]")).toHaveClass("rounded-full", "size-6");
  });

  describe("길게 누르기 툴팁", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const tooltip = () => document.body.querySelector(":scope > [aria-hidden='true']");

    it("줄인 칩을 500ms 누르면 전체 이름을 보이고, 손을 떼면 닫는다", () => {
      render(<Tag variant="summary">향료/알레르기 성분</Tag>);
      const chip = screen.getByText("향료/…").parentElement!;

      fireEvent.pointerDown(chip, { pointerType: "touch", clientX: 0, clientY: 0 });
      act(() => vi.advanceTimersByTime(499));
      expect(tooltip()).toBeNull();

      act(() => vi.advanceTimersByTime(1));
      expect(tooltip()).toHaveTextContent("향료/알레르기 성분");

      fireEvent.pointerUp(chip, { pointerType: "touch" });
      expect(tooltip()).toBeNull();
    });

    it("누른 채 움직이면 스크롤로 보고 열지 않는다", () => {
      render(<Tag variant="summary">향료/알레르기 성분</Tag>);
      const chip = screen.getByText("향료/…").parentElement!;

      fireEvent.pointerDown(chip, { pointerType: "touch", clientX: 0, clientY: 0 });
      fireEvent.pointerMove(chip, { pointerType: "touch", clientX: 0, clientY: 20 });
      act(() => vi.advanceTimersByTime(600));

      expect(tooltip()).toBeNull();
    });

    it("마우스는 400ms 올려 두면 열고, 방금 닫힌 직후 옆 칩으로 옮기면 바로 연다", () => {
      render(
        <>
          <Tag variant="summary">향료/알레르기 성분</Tag>
          <Tag variant="summary">비스-베헤닐/아이소스테아릴</Tag>
        </>,
      );
      const first = screen.getByText("향료/…").parentElement!;
      const second = screen.getByText("비스-베헤닐/…").parentElement!;

      fireEvent.pointerOver(first, { pointerType: "mouse" });
      act(() => vi.advanceTimersByTime(399));
      expect(tooltip()).toBeNull();
      act(() => vi.advanceTimersByTime(1));
      expect(tooltip()).toHaveTextContent("향료/알레르기 성분");

      fireEvent.pointerOut(first, { pointerType: "mouse", relatedTarget: second });
      fireEvent.pointerOver(second, { pointerType: "mouse", relatedTarget: first });
      act(() => vi.advanceTimersByTime(0));
      expect(tooltip()).toHaveTextContent("비스-베헤닐/아이소스테아릴");
    });

    it("줄이지 않은 칩은 툴팁을 열지 않는다", () => {
      render(<Tag variant="summary">판테놀</Tag>);
      const chip = screen.getByText("판테놀", { selector: "[aria-hidden]" }).parentElement!;

      fireEvent.pointerDown(chip, { pointerType: "touch", clientX: 0, clientY: 0 });
      act(() => vi.advanceTimersByTime(600));

      expect(tooltip()).toBeNull();
    });
  });
});

describe("Tag 줄 높이", () => {
  it("모든 모양의 글자 줄 높이가 1 이다. 글자 크기 클래스가 뒤에 와도 지워지지 않는다(TYPO T04)", () => {
    const { container } = render(
      <>
        <Tag variant="item">판테놀</Tag>
        <Tag variant="summary">판테놀</Tag>
        <Tag variant="label" tone="info">
          보습
        </Tag>
      </>,
    );

    for (const chip of container.children) expect(chip).toHaveClass("leading-none");
  });
});

describe("Badge", () => {
  it("평가 배지는 글자가 없어 이름을 붙인다", () => {
    render(
      <>
        <Badge variant="rating" rating="good" />
        <Badge variant="rating" rating="bad" />
        <Badge variant="ai" />
      </>,
    );

    expect(screen.getByRole("img", { name: "내 평가: 잘 맞았어요" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "내 평가: 안 맞았어요" })).toBeInTheDocument();
    expect(screen.getByText("AI 요약")).toBeInTheDocument();
  });
});
