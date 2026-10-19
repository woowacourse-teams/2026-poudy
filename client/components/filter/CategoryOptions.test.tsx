/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { CategoryOptions } from "./CategoryOptions";

const categories = [
  {
    id: 1,
    name: "스킨케어",
    productCount: 3,
    children: [
      { id: 3, name: "토너", productCount: 1 },
      { id: 4, name: "크림", productCount: 2 },
    ],
  },
  { id: 2, name: "클렌징", productCount: 1, children: [{ id: 5, name: "클렌저", productCount: 1 }] },
];

function Options({ initial }: { readonly initial: readonly number[] }) {
  const [selectedIds, onSelect] = useState<readonly number[]>(initial);
  return (
    <>
      <CategoryOptions categories={categories} selectedIds={selectedIds} onSelect={onSelect} />
      <output>{selectedIds.join(",")}</output>
    </>
  );
}

describe("카테고리 시트(명세 S23c)", () => {
  it("고른 소분류가 있는 대분류를 펼치고 하나만 고른다", async () => {
    render(<Options initial={[4]} />);

    expect(screen.getByRole("button", { name: "스킨케어" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("radio", { name: "크림" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "전체" })).not.toBeChecked();
  });

  it("전체를 고르면 대분류 ID 를 담는다. 서버가 그 아래 소분류를 모두 찾는다", async () => {
    render(<Options initial={[]} />);

    await userEvent.click(screen.getByRole("radio", { name: "전체" }));

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("소분류가 하나뿐인 대분류에서도 그 소분류를 전체와 따로 고른다", async () => {
    render(<Options initial={[2]} />);
    expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "클렌저" }));

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "클렌저" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "전체" })).not.toBeChecked();
  });

  it("예전 주소처럼 소분류를 모두 담은 값도 전체로 읽는다", () => {
    render(<Options initial={[3, 4]} />);

    expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();
  });

  it("소분류를 고르면 앞의 선택이 풀린다", async () => {
    render(<Options initial={[3]} />);

    await userEvent.click(screen.getByRole("radio", { name: "크림" }));

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "토너" })).not.toBeChecked();
  });

  it("대분류는 한 번에 하나만 펼친다", async () => {
    render(<Options initial={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "클렌징" }));

    expect(screen.getByRole("button", { name: "클렌징" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "스킨케어" })).toHaveAttribute("aria-expanded", "false");
  });
});
