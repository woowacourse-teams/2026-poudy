/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProductVariants } from "./ProductVariants";

const variant = (id: number, volumeValue: number, volumeUnit = "ml") => ({
  id,
  price: 1000 * id,
  volumeValue,
  volumeUnit,
  status: "active",
});

describe("용량별 정가 접기", () => {
  it("용량이 하나면 접기 버튼이 없다", () => {
    render(<ProductVariants variants={[variant(1, 200)]} />);

    expect(screen.getByText("200ml")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("용량이 없으면 그리지 않는다", () => {
    const { container } = render(<ProductVariants variants={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("처음에는 첫 용량만 보이고 나머지는 이름으로 미리 보여 주며, 누르면 펼쳐 접기로 바뀐다", async () => {
    render(<ProductVariants variants={[variant(1, 30), variant(2, 100), variant(3, 200), variant(4, 500)]} />);

    expect(screen.getByText("정가 1,000원")).toBeVisible();
    expect(screen.getByText("정가 2,000원")).not.toBeVisible();
    const trigger = screen.getByRole("button", { name: "나머지 용량 100 · 200 · 500ml 펼치기" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("100 · 200 · 500ml")).toBeInTheDocument();

    await userEvent.click(trigger);

    expect(screen.getByText("정가 2,000원")).toBeVisible();
    expect(screen.getByText("접기")).toBeInTheDocument();
    const fold = screen.getByRole("button", { name: "나머지 용량 접기" });
    expect(fold).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(fold);
    expect(screen.getByText("정가 2,000원")).not.toBeVisible();
  });

  it("가격이 없으면 정가 대신 가격 정보 없음을 적고 단가를 숨긴다", () => {
    render(<ProductVariants variants={[{ ...variant(1, 200), price: null }]} />);

    expect(screen.getByText("가격 정보 없음")).toBeInTheDocument();
    expect(screen.queryByText(/정가/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ml당/)).not.toBeInTheDocument();
  });

  it("단위가 다르면 용량마다 단위를 적는다", () => {
    render(<ProductVariants variants={[variant(1, 30), variant(2, 100, "g"), variant(3, 200)]} />);

    expect(screen.getByText("100g · 200ml")).toBeInTheDocument();
  });
});
