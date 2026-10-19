/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PRODUCT_PLACEHOLDER, ProductImage } from "./ProductImage";

const S3_PRODUCT =
  "https://techcourse-project-2026.s3.ap-northeast-2.amazonaws.com/poudy/images/products/%E1%84%90%E1%85%A9%E1%84%82%E1%85%A5.webp";
const variant = (width: number) => S3_PRODUCT.replace(/\.webp$/, `_${width}.webp`);
const CDN = "https://d2rcowg6kz7uw3.cloudfront.net";

afterEach(() => vi.unstubAllEnvs());

const image = () => document.querySelector("img") as HTMLImageElement;

describe("제품 그림", () => {
  it("S3 제품 그림은 칸별 사본을 srcset 으로 내고, 그리는 크기를 sizes 로 알린다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={64} />);

    expect(image().getAttribute("srcset")).toBe(
      [128, 192, 288, 384, 576, 768].map((width) => `${variant(width)} ${width}w`).join(", "),
    );
    expect(image()).toHaveAttribute("sizes", "64px");
    expect(image()).toHaveAttribute("src", S3_PRODUCT);
  });

  it("CDN 설정 시 원본과 크기별 사본을 모두 CloudFront에서 받는다", () => {
    vi.stubEnv("NEXT_PUBLIC_IMAGE_CDN_BASE_URL", CDN);

    render(<ProductImage src={S3_PRODUCT} alt="" size={64} />);

    expect(image()).toHaveAttribute("src", `${CDN}/poudy/images/products/%E1%84%90%E1%85%A9%E1%84%82%E1%85%A5.webp`);
    expect(image().getAttribute("srcset")).toBe(
      [128, 192, 288, 384, 576, 768]
        .map((width) => `${CDN}/poudy/images/products/%E1%84%90%E1%85%A9%E1%84%82%E1%85%A5_${width}.webp ${width}w`)
        .join(", "),
    );
  });

  it("S3 제품 그림이 아니면 사본 없이 주소를 그대로 쓴다", () => {
    render(<ProductImage src="/images/products/placeholder.png" alt="" size={64} />);

    expect(image()).not.toHaveAttribute("srcset");
    expect(image()).not.toHaveAttribute("sizes");
    expect(image()).toHaveAttribute("src", "/images/products/placeholder.png");
  });

  it("next/image 와 같은 기본값을 둔다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={40} />);

    expect(image()).toHaveAttribute("loading", "lazy");
    expect(image()).toHaveAttribute("decoding", "async");
    expect(image()).toHaveAttribute("width", "40");
    expect(image()).toHaveAttribute("height", "40");
    expect(image()).toHaveClass("text-transparent");
  });

  it("사본을 받지 못하면 원본으로 다시 받는다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={64} />);

    fireEvent.error(image());

    expect(image()).not.toHaveAttribute("srcset");
    expect(image()).toHaveAttribute("src", S3_PRODUCT);
  });

  it("원본까지 받지 못하면 조용히 기본 공병 그림으로 바꾼다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={64} />);

    fireEvent.error(image());
    fireEvent.error(image());

    expect(image()).toHaveAttribute("src", PRODUCT_PLACEHOLDER);
    expect(image()).toHaveAttribute("data-product-image-state", "placeholder");
    expect(image()).toHaveClass("text-transparent");
  });

  it("주소가 없으면 처음부터 기본 공병 그림을 같은 칸에 보여 준다", () => {
    render(<ProductImage src="" alt="" size={80} />);

    expect(image()).toHaveAttribute("src", PRODUCT_PLACEHOLDER);
    expect(image()).toHaveClass("size-20", "object-contain");
  });

  it("공병 그림마저 받지 못하면 대체 텍스트를 드러낸다", () => {
    render(<ProductImage src="" alt="제품 이미지" size={80} />);

    fireEvent.error(image());

    expect(image()).not.toHaveClass("text-transparent");
  });

  it("고정 칸은 칸 크기로 자리를 잡고, 사진에 반경을 주지 않는다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={184} />);

    expect(image()).toHaveClass("size-46", "object-contain");
    expect(image().className).not.toMatch(/rounded/);
  });

  it("폭이 변하는 칸은 받은 sizes 를 그대로 알리고 칸 크기는 쓰는 쪽에 맡긴다", () => {
    render(<ProductImage src={S3_PRODUCT} alt="" size={132} sizes="calc((100vw - 52px) / 3)" className="size-full" />);

    expect(image()).toHaveAttribute("sizes", "calc((100vw - 52px) / 3)");
    expect(image()).toHaveAttribute("width", "132");
    expect(image()).toHaveClass("size-full");
    expect(image().className).not.toMatch(/size-\d/);
  });

  it("주소가 바뀌면 이전 주소의 실패를 가져가지 않는다", () => {
    const next = S3_PRODUCT.replace("%E1%84%90", "%E1%84%91");
    const { rerender } = render(<ProductImage src={S3_PRODUCT} alt="" size={64} />);

    fireEvent.error(image());
    fireEvent.error(image());
    rerender(<ProductImage src={next} alt="" size={64} />);

    expect(image()).toHaveAttribute("srcset");
    expect(image()).toHaveAttribute("data-product-image-state", "photo");
  });
});
