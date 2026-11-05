/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandWithMark, ProductMarkTag } from "./ProductMarkTag";

const DAISO = { code: "DAISO", name: "다이소" };
const MINERAL = { code: "MINERAL", name: "무기자차" };

describe("ProductMarkTag", () => {
  it("다이소 마크가 있으면 서버가 준 표시명을 대체 텍스트로 쓴 로고 태그를 그린다", () => {
    render(<ProductMarkTag marks={[MINERAL, DAISO]} />);

    expect(screen.getByRole("img", { name: "다이소" })).toHaveAttribute("src", "/images/marks/daiso.svg");
  });

  it("마크가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<ProductMarkTag marks={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("다이소가 아닌 마크만 있으면 아무것도 그리지 않는다", () => {
    const { container } = render(<ProductMarkTag marks={[MINERAL]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("BrandWithMark", () => {
  it("브랜드 이름 뒤에 태그를 둔다", () => {
    render(
      <BrandWithMark marks={[DAISO]}>
        <span>라운드랩</span>
      </BrandWithMark>,
    );

    const brand = screen.getByText("라운드랩");
    expect(brand.nextElementSibling).toBe(screen.getByRole("img", { name: "다이소" }));
  });
});
