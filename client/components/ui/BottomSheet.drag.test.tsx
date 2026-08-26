/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { BottomSheet } from "./BottomSheet";

beforeAll(() => {
  // jsdom 에는 포인터 캡처가 없다. 끌기는 이것 없이도 성립한다.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

const setup = () => {
  const onClose = vi.fn();
  render(
    <BottomSheet open onClose={onClose}>
      <BottomSheet.Header title="카테고리" />
      <BottomSheet.Body>
        <button type="button">내용</button>
      </BottomSheet.Body>
    </BottomSheet>,
  );
  const sheet = screen.getByRole("dialog");
  return { onClose, sheet, handle: sheet.firstElementChild as HTMLElement };
};

/** 눌러서 옮기고 놓는 한 번의 끌기. `ms` 로 얼마나 오래 끌었는지 정한다. */
const drag = (handle: HTMLElement, distance: number, ms = 400) => {
  const now = vi.spyOn(Date, "now");
  now.mockReturnValue(1_000);
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0, pointerType: "touch" });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 100 + distance });
  now.mockReturnValue(1_000 + ms);
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 100 + distance });
  now.mockRestore();
};

describe("BottomSheet 끌어 닫기", () => {
  it("끄는 동안 손가락을 따라 내려온다", () => {
    const { sheet, handle } = setup();

    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 160 });

    expect(sheet.style.transform).toBe("translateY(60px)");
  });

  it("위로는 끌리지 않는다", () => {
    const { sheet, handle } = setup();

    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0, pointerType: "touch" });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 40 });

    expect(sheet.style.transform).toBe("");
  });

  it("충분히 내리고 놓으면 닫는다", () => {
    const { onClose, handle } = setup();

    drag(handle, 120);

    expect(onClose).toHaveBeenCalled();
  });

  it("조금만 내리고 놓으면 제자리로 되돌린다", () => {
    const { onClose, sheet, handle } = setup();

    drag(handle, 20);

    expect(onClose).not.toHaveBeenCalled();
    expect(sheet.style.transform).toBe("");
  });

  it("닫힐 만큼 내리고 놓아도 끌던 자리가 남지 않는다", () => {
    const { sheet, handle } = setup();

    drag(handle, 120);

    // 남아 있으면 inline transform 이 내려가는 전환을 덮어써 그 자리에 멈춘다.
    expect(sheet.style.transform).toBe("");
  });

  it("조금만 내렸어도 빠르게 튕기면 닫는다", () => {
    const { onClose, handle } = setup();

    drag(handle, 40, 50);

    expect(onClose).toHaveBeenCalled();
  });

  it("마우스 오른쪽 버튼으로는 끌리지 않는다", () => {
    const { sheet, handle } = setup();

    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 2, pointerType: "mouse" });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 200 });

    expect(sheet.style.transform).toBe("");
  });
});
