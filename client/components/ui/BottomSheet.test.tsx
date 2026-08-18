/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

const renderSheet = (overrides: Partial<Parameters<typeof BottomSheet>[0]> = {}) => {
  const props = {
    open: true,
    title: "브랜드",
    description: "원하는 브랜드를 선택해 주세요",
    onClose: vi.fn(),
    onReset: vi.fn(),
    submitLabel: "3개 제품 보기",
    onSubmit: vi.fn(),
    children: <button type="button">라운드랩</button>,
    ...overrides,
  };

  return { props, ...render(<BottomSheet {...props} />) };
};

describe("BottomSheet", () => {
  it("닫혀 있으면 아무것도 그리지 않는다", () => {
    renderSheet({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("제목으로 이름을 붙인 대화상자를 연다", () => {
    renderSheet();
    expect(screen.getByRole("dialog", { name: "브랜드" })).toHaveAttribute("aria-modal", "true");
  });

  it("Esc 를 누르면 닫는다", async () => {
    const { props } = renderSheet();

    await userEvent.keyboard("{Escape}");

    expect(props.onClose).toHaveBeenCalled();
  });

  it("적용 버튼에 결과 개수를 보여 준다", async () => {
    const { props } = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: "3개 제품 보기" }));

    expect(props.onSubmit).toHaveBeenCalled();
  });

  it("초기화 버튼을 누르면 조건을 지운다", async () => {
    const { props } = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: "초기화" }));

    expect(props.onReset).toHaveBeenCalled();
  });

  it("열리면 시트 안으로 초점을 옮긴다", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: "라운드랩" })).toHaveFocus();
  });

  it("Tab 을 눌러도 초점이 시트 밖으로 나가지 않는다", async () => {
    renderSheet();
    const inside = [
      screen.getByRole("button", { name: "라운드랩" }),
      screen.getByRole("button", { name: "초기화" }),
      screen.getByRole("button", { name: "3개 제품 보기" }),
    ];

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();

    expect(inside).toContain(document.activeElement);
  });
});
