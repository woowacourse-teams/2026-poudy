/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "./bottom-sheet";
import { ConfirmSheet } from "./confirm-sheet";

afterEach(() => {
  document.getElementById("overlay-root")?.remove();
  document.documentElement.style.overflow = "";
});

function Sample({ onClose = () => undefined }: { readonly onClose?: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        필터 열기
      </button>
      <BottomSheet
        open={open}
        onClose={(reason) => {
          onClose(reason);
          setOpen(false);
        }}
      >
        <BottomSheetHeader title="카테고리" onClose={() => setOpen(false)} />
        <BottomSheetBody>
          <button type="button">스킨/토너</button>
        </BottomSheetBody>
        <BottomSheetFooter>
          <button type="button" onClick={() => setConfirm(true)}>
            초기화
          </button>
        </BottomSheetFooter>
      </BottomSheet>
      <ConfirmSheet
        open={confirm}
        title="모두 지울까요?"
        description="선택이 처음으로 돌아가요."
        confirmLabel="지우기"
        tone="destructive"
        onCancel={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
      />
    </>
  );
}

const overlayLayers = () => [...(document.getElementById("overlay-root")?.children ?? [])];

describe("BottomSheet", () => {
  it("#overlay-root 에 dialog 로 열리고, 제목에 포커스를 두며 본문을 inert 로 막는다", async () => {
    render(<Sample />);
    fireEvent.click(screen.getByRole("button", { name: "필터 열기" }));

    const dialog = await screen.findByRole("dialog", { name: "카테고리" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.getElementById("overlay-root")).toContainElement(dialog);
    expect(screen.getByRole("heading", { name: "카테고리" })).toHaveFocus();
    const others = [...document.body.children].filter((element) => element.id !== "overlay-root");
    expect(others.every((element) => element.hasAttribute("inert"))).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("Esc 는 취소와 같고, 닫힌 뒤 연 버튼으로 포커스를 돌려주며 inert 를 푼다", async () => {
    const onClose = vi.fn();
    render(<Sample onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "필터 열기" });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("dialog", { name: "카테고리" });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledWith("escape");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("딤을 누르면 backdrop 까닭으로 닫는다", async () => {
    const onClose = vi.fn();
    render(<Sample onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "필터 열기" }));
    await screen.findByRole("dialog");

    const scrim = overlayLayers()[0]?.firstElementChild as HTMLElement;
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledWith("backdrop");
  });

  it("마지막 요소에서 Tab 을 누르면 시트 안 처음으로 돌아간다", async () => {
    render(<Sample />);
    fireEvent.click(screen.getByRole("button", { name: "필터 열기" }));
    const dialog = await screen.findByRole("dialog");
    const last = screen.getByRole("button", { name: "초기화" });

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
  });
});

describe("ConfirmSheet", () => {
  it("시트 위에 확인 층으로 겹치고, 첫 포커스는 취소다. Esc 는 맨 위 확인 시트만 닫는다", async () => {
    render(<Sample />);
    fireEvent.click(screen.getByRole("button", { name: "필터 열기" }));
    await screen.findByRole("dialog", { name: "카테고리" });
    const reset = screen.getByRole("button", { name: "초기화" });
    reset.focus();
    fireEvent.click(reset);

    const confirm = await screen.findByRole("dialog", { name: "모두 지울까요?" });
    expect(confirm).toHaveAccessibleDescription("선택이 처음으로 돌아가요.");
    expect(screen.getByRole("button", { name: "취소" })).toHaveFocus();
    expect(overlayLayers().map((layer) => layer.hasAttribute("inert"))).toEqual([true, false]);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "모두 지울까요?" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "카테고리" })).toBeInTheDocument();
    expect(reset).toHaveFocus();
  });

  it("실행 버튼은 일반·위험 가운데 고르고, 막을 때는 이유 문구와 잇는다", async () => {
    const onConfirm = vi.fn();
    render(
      <>
        <p id="reason">만 14세 이상인지 확인해 주세요.</p>
        <ConfirmSheet
          open
          title="가입할까요?"
          description="확인하면 가입이 끝나요."
          confirmLabel="가입하기"
          confirmDisabledReasonId="reason"
          onCancel={() => undefined}
          onConfirm={onConfirm}
        />
      </>,
    );
    const confirm = await screen.findByRole("button", { name: "가입하기" });

    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("만 14세 이상인지 확인해 주세요.");
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
