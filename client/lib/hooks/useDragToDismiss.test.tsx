/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDragToDismiss } from "./useDragToDismiss";

function Handle({ onClose }: { readonly onClose: () => void }) {
  const { handleProps } = useDragToDismiss(vi.fn());

  return (
    <div data-testid="handle" {...handleProps}>
      <button type="button" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}

describe("useDragToDismiss", () => {
  it("머리를 누르면 끌기 위해 포인터를 잡는다", () => {
    render(<Handle onClose={vi.fn()} />);
    const handle = screen.getByTestId("handle");
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { pointerId: 1, pointerType: "touch" });

    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("머리 안의 버튼을 누르면 포인터를 잡지 않아 버튼이 눌린다", () => {
    render(<Handle onClose={vi.fn()} />);
    const handle = screen.getByTestId("handle");
    handle.setPointerCapture = vi.fn();

    fireEvent.pointerDown(screen.getByRole("button", { name: "닫기" }), { pointerId: 1, pointerType: "touch" });

    expect(handle.setPointerCapture).not.toHaveBeenCalled();
  });
});
