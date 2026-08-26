/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

type Options = {
  readonly open?: boolean;
  readonly submitLabel?: string;
  readonly submitDisabled?: boolean;
};

/** 네 필터 시트가 쌓는 것과 같은 차림. */
const renderSheet = ({ open = true, submitLabel = "3개 제품 보기", submitDisabled }: Options = {}) => {
  const props = { onClose: vi.fn(), onReset: vi.fn(), onSubmit: vi.fn() };

  return {
    props,
    ...render(
      <BottomSheet open={open} onClose={props.onClose}>
        <BottomSheet.Header title="브랜드" description="원하는 브랜드를 선택해 주세요" />
        <BottomSheet.Body>
          <button type="button">라운드랩</button>
        </BottomSheet.Body>
        <BottomSheet.Footer>
          <BottomSheet.ResetButton onClick={props.onReset} />
          <BottomSheet.SubmitButton onClick={props.onSubmit} disabled={submitDisabled}>
            {submitLabel}
          </BottomSheet.SubmitButton>
        </BottomSheet.Footer>
      </BottomSheet>,
    ),
  };
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
    // 머리 부분에는 조작 요소가 없어 내용의 첫 요소가 받는다.
    expect(screen.getByRole("button", { name: "라운드랩" })).toHaveFocus();
  });

  it("딤을 누르면 닫는다", async () => {
    const { props } = renderSheet();

    await userEvent.click(document.querySelector(".bottom-sheet-dim") as HTMLElement);

    expect(props.onClose).toHaveBeenCalled();
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

  it("볼 것이 없으면 적용 버튼을 누를 수 없다", async () => {
    const { props } = renderSheet({ submitDisabled: true, submitLabel: "0개 제품 보기" });
    const submit = screen.getByRole("button", { name: "0개 제품 보기" });

    expect(submit).toBeDisabled();

    await userEvent.click(submit);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("막지 않으면 적용 버튼을 누를 수 있다", async () => {
    const { props } = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: "3개 제품 보기" }));

    expect(props.onSubmit).toHaveBeenCalled();
  });
});
