/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ImageAttachment } from "./image-attachment";
import type { AttachedImage, ImageAttachmentProps } from "./image-attachment";

const IMAGES: readonly AttachedImage[] = [
  { key: "a", src: "blob:a", status: "uploaded" },
  { key: "b", src: "blob:b", status: "uploading" },
  { key: "c", src: "blob:c", status: "failed" },
];

const renderAttachment = (props: Partial<ImageAttachmentProps> = {}) => {
  const handlers = {
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
  };
  render(
    <ImageAttachment
      label="사진"
      images={IMAGES}
      max={5}
      accept="image/jpeg,image/png,image/heic,image/heif"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe("ImageAttachment", () => {
  it("칸 이름으로 묶고, 사진마다 대상이 드러나는 이름을 준다(A11Y D05)", () => {
    renderAttachment({ onOpen: vi.fn() });

    expect(screen.getByRole("group", { name: "사진" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사진 추가" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "첨부 사진 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부 사진 1 크게 보기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부 사진 1 삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부 사진 2 올리기 취소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부 사진 3 다시 올리기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부 사진 3 삭제" })).toBeInTheDocument();
  });

  it("업로드 취소·다시 시도·삭제는 쓰는 쪽이 넘긴 일을 부른다", () => {
    const handlers = renderAttachment();

    fireEvent.click(screen.getByRole("button", { name: "첨부 사진 2 올리기 취소" }));
    fireEvent.click(screen.getByRole("button", { name: "첨부 사진 3 다시 올리기" }));
    fireEvent.click(screen.getByRole("button", { name: "첨부 사진 1 삭제" }));
    expect(handlers.onCancel).toHaveBeenCalledWith("b");
    expect(handlers.onRetry).toHaveBeenCalledWith("c");
    expect(handlers.onRemove).toHaveBeenCalledWith("a");
  });

  it("추가 버튼은 파일 고르기를 열고, 고른 파일을 넘긴다", () => {
    const handlers = renderAttachment();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const pick = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "사진 추가" }));
    expect(pick).toHaveBeenCalled();
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/heic,image/heif");
    expect(input).toHaveAttribute("multiple");

    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(handlers.onSelect).toHaveBeenCalledWith([file]);
  });

  it("다 차면 추가 버튼을 막고 이유를 상태 줄로 읽는다", () => {
    renderAttachment({ max: 3, status: "3 / 3장 · 장당 5MB 이하" });
    const add = screen.getByRole("button", { name: "사진 추가" });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const pick = vi.spyOn(input, "click");

    expect(add).toHaveAttribute("aria-disabled", "true");
    expect(add).toHaveAccessibleDescription("3 / 3장 · 장당 5MB 이하");
    fireEvent.click(add);
    expect(pick).not.toHaveBeenCalled();
  });

  it("오류는 상태 줄 자리에 알리고, 올리지 못한 사진에 잇는다", () => {
    renderAttachment({ status: "3 / 5장", error: "1장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요." });

    expect(screen.queryByText("3 / 5장")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부 사진 3 다시 올리기" })).toHaveAccessibleDescription(
      "1장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.",
    );
  });

  it("사진을 지우면 포커스를 다음 사진 → 앞 사진 → 추가 버튼 순으로 옮긴다(A11Y D02)", () => {
    function Sample() {
      const [images, setImages] = useState<readonly AttachedImage[]>([
        { key: "a", src: "blob:a", status: "uploaded" },
        { key: "b", src: "blob:b", status: "uploaded" },
      ]);
      const remove = (key: string) => setImages((current) => current.filter((image) => image.key !== key));
      return (
        <ImageAttachment
          label="사진"
          images={images}
          max={5}
          accept="image/png"
          onSelect={vi.fn()}
          onRemove={remove}
          onCancel={remove}
          onRetry={vi.fn()}
        />
      );
    }
    render(<Sample />);

    fireEvent.click(screen.getByRole("button", { name: "첨부 사진 1 삭제" }));
    // 남은 사진이 첫째가 되어 이름이 '첨부 사진 1' 로 바뀐다.
    expect(screen.getByRole("button", { name: "첨부 사진 1 삭제" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "첨부 사진 1 삭제" }));
    expect(screen.getByRole("button", { name: "사진 추가" })).toHaveFocus();
  });

  it("사진이 없을 때만 추가 버튼 옆 안내를 보인다", () => {
    renderAttachment({ images: [], max: 1, aside: "뒷면 전성분이 보이게 찍어 주세요" });
    expect(screen.getByText("뒷면 전성분이 보이게 찍어 주세요")).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toHaveAttribute("multiple");
  });
});
