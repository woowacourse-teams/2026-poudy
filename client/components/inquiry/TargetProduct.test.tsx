/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TargetProduct } from "./TargetProduct";

import { PRODUCT_PLACEHOLDER } from "@/components/ui/ProductThumbnail";

const image = () => document.querySelector("img") as HTMLImageElement;

const decoded = () => decodeURIComponent(image().getAttribute("src") ?? "");

describe("정정 대상 제품", () => {
  it("브랜드와 제품명을 보여 준다", () => {
    render(<TargetProduct brandName="라운드랩" productName="1025 독도 토너" imageUrl="/a.png" />);

    expect(screen.getByText("라운드랩")).toBeInTheDocument();
    expect(screen.getByText("1025 독도 토너")).toBeInTheDocument();
  });

  it("사진 주소가 있으면 그 사진을 쓴다", () => {
    render(<TargetProduct brandName="라운드랩" productName="토너" imageUrl="/images/products/toner.png" />);

    expect(decoded()).toContain("/images/products/toner.png");
  });

  it("사진 주소가 없으면 공병 그림으로 자리를 채운다", () => {
    render(<TargetProduct brandName="라운드랩" productName="토너" imageUrl="" />);

    expect(decoded()).toContain(PRODUCT_PLACEHOLDER);
  });

  it("사진을 받아 오지 못하면 공병 그림으로 바꾼다", () => {
    render(<TargetProduct brandName="라운드랩" productName="토너" imageUrl="/images/products/toner.png" />);

    fireEvent.error(image());

    expect(decoded()).toContain(PRODUCT_PLACEHOLDER);
  });

  it("사용자가 바꿀 수 없으므로 누를 수 있는 것을 두지 않는다", () => {
    render(<TargetProduct brandName="라운드랩" productName="토너" imageUrl="/a.png" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
