/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLogo } from "./BrandLogo";

describe("BrandLogo", () => {
  it("목록의 로고는 기본적으로 지연해서 불러온다", () => {
    const { container } = render(<BrandLogo name="라운드랩" imageUrl="/brand.png" />);

    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("첫 화면의 로고는 즉시 불러올 수 있다", () => {
    const { container } = render(<BrandLogo name="라운드랩" imageUrl="/brand.png" loading="eager" />);

    expect(container.querySelector("img")).toHaveAttribute("loading", "eager");
  });

  it("그림이 없으면 이름 첫 글자를 회색 원에 그리고, 눌린 행에서 원을 바꿀 표지를 단다", () => {
    const { container } = render(<BrandLogo name=" 라운드랩" size={28} />);
    const disc = container.firstElementChild;

    expect(disc).toHaveTextContent("라");
    expect(disc).toHaveClass("size-7", "bg-surface");
    expect(disc).toHaveAttribute("data-logo-disc");
  });
});
