/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImageViewer } from "./ImageViewer";

import type { AttachedImage } from "@/lib/hooks/useImageUpload";

const image = (key: string): AttachedImage => ({
  key,
  file: new File(["x"], `${key}.png`, { type: "image/png" }),
  previewUrl: `blob:${key}`,
  status: "uploaded",
  imageId: `id-${key}`,
});

const IMAGES = [image("a"), image("b"), image("c")];

const setup = (images: readonly AttachedImage[] = IMAGES, initialKey = "a") => {
  const onRemove = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<ImageViewer images={images} initialKey={initialKey} onRemove={onRemove} onClose={onClose} />);
  return { user, onRemove, onClose };
};

describe("ImageViewer(S40d)", () => {
  it("연 사진과 순서를 보여 주고, 사진 칸에 처음 포커스를 둔다", () => {
    setup(IMAGES, "b");

    expect(screen.getByRole("dialog", { name: "첨부 사진" })).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "첨부 사진 2" })).toHaveFocus();
  });

  it("첫 사진에서는 이전 버튼을 숨기고, 다음 버튼과 방향키로 넘긴다", async () => {
    const { user } = setup();

    expect(screen.queryByRole("button", { name: "이전 사진" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음 사진" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    screen.getByRole("group", { name: "첨부 사진 2" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다음 사진" })).not.toBeInTheDocument();
  });

  it("1배에서는 축소를, 3배에서는 확대를 막는다", async () => {
    const { user } = setup();
    const zoomIn = screen.getByRole("button", { name: "확대" });
    const zoomOut = screen.getByRole("button", { name: "축소" });

    expect(zoomOut).toHaveAttribute("aria-disabled", "true");
    await user.click(zoomIn);
    await user.click(zoomIn);
    expect(zoomIn).toHaveAttribute("aria-disabled", "true");
    expect(zoomOut).not.toHaveAttribute("aria-disabled");
  });

  it("확대한 동안에는 방향키가 사진을 바꾸지 않고 보이는 곳을 옮긴다", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "확대" }));
    screen.getByRole("group", { name: "첨부 사진 1" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "첨부 사진 1" }).style.transform).toContain("scale(2)");
  });

  it("Esc 로 닫는다", async () => {
    const { user, onClose } = setup();
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("삭제는 확인 시트를 거치고, 취소하면 아무것도 지우지 않는다", async () => {
    const { user, onRemove } = setup();
    await user.click(screen.getByRole("button", { name: "이 사진 삭제" }));

    expect(await screen.findByRole("dialog", { name: "이 사진을 삭제할까요?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("남은 사진이 없으면 지운 뒤 뷰어를 닫고 사진 추가 버튼으로 보낸다", async () => {
    const { user, onRemove, onClose } = setup([image("a")]);
    await user.click(screen.getByRole("button", { name: "이 사진 삭제" }));
    await user.click(await screen.findByRole("button", { name: "삭제" }));

    expect(onRemove).toHaveBeenCalledWith("a");
    expect(onClose).toHaveBeenCalledWith(true);
  });
});
