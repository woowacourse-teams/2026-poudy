/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductImage } from "./ProductImage";

const S3_PRODUCT =
  "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%90%E1%85%A9%E1%84%82%E1%85%A5.webp";
const variant = (width: number) => S3_PRODUCT.replace(/\.webp$/, `_${width}.webp`);

const image = () => document.querySelector("img") as HTMLImageElement;

describe("제품 그림", () => {
  it("S3 제품 그림은 칸별 사본을 srcset 으로 내고, 그리는 크기를 sizes 로 알린다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={96} />);

    expect(image().getAttribute("srcset")).toBe(
      [128, 192, 288, 384, 576, 768].map((width) => `${variant(width)} ${width}w`).join(", "),
    );
    expect(image()).toHaveAttribute("sizes", "96px");
    expect(image()).toHaveAttribute("src", S3_PRODUCT);
  });

  it("S3 제품 그림이 아니면 사본 없이 주소를 그대로 쓴다", () => {
    render(<ProductImage src="/images/products/placeholder.png" alt="" size={96} />);

    expect(image()).not.toHaveAttribute("srcset");
    expect(image()).not.toHaveAttribute("sizes");
    expect(image()).toHaveAttribute("src", "/images/products/placeholder.png");
  });

  it("next/image 와 같은 기본값을 둔다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={42} />);

    expect(image()).toHaveAttribute("loading", "lazy");
    expect(image()).toHaveAttribute("decoding", "async");
    expect(image()).toHaveAttribute("width", "42");
    expect(image()).toHaveAttribute("height", "42");
    expect(image().style.color).toBe("transparent");
  });

  it("사본을 받지 못하면 원본으로 다시 받고, 실패로 알리지 않는다", () => {
    const onError = vi.fn();
    render(<ProductImage src={S3_PRODUCT} alt="" size={96} onError={onError} />);

    fireEvent.error(image());

    expect(image()).not.toHaveAttribute("srcset");
    expect(image()).toHaveAttribute("src", S3_PRODUCT);
    expect(onError).not.toHaveBeenCalled();
  });

  it("원본까지 받지 못하면 실패로 알리고 대체 텍스트를 드러낸다", () => {
    const onError = vi.fn();
    render(<ProductImage src={S3_PRODUCT} alt="제품 이미지" size={96} onError={onError} />);

    fireEvent.error(image());
    fireEvent.error(image());

    expect(onError).toHaveBeenCalledTimes(1);
    expect(image().style.color).toBe("");
  });

  it("주소가 바뀌면 이전 주소의 실패를 가져가지 않는다", () => {
    const next = S3_PRODUCT.replace("%E1%84%90", "%E1%84%91");
    const { rerender } = render(<ProductImage src={S3_PRODUCT} alt="" size={96} />);

    fireEvent.error(image());
    rerender(<ProductImage src={next} alt="" size={96} />);

    expect(image()).toHaveAttribute("srcset");
  });
});
