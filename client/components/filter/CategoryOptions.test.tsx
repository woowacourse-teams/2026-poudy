/** @vitest-environment jsdom */
import { render, screen, within } from "@testing-library/react";
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

function Options() {
  const [selectedIds, onSelect] = useState<readonly number[]>([3, 5]);
  return <CategoryOptions categories={categories} selectedIds={selectedIds} onSelect={onSelect} />;
}

describe("카테고리 다중 선택", () => {
  it("소분류를 추가하거나 해제해도 다른 선택은 유지한다", async () => {
    render(<Options />);
    const toner = screen.getByRole("checkbox", { name: "토너" });
    const cream = screen.getByRole("checkbox", { name: "크림" });
    await userEvent.click(cream);
    expect(toner).toBeChecked();
    expect(cream).toBeChecked();
    await userEvent.click(toner);
    expect(toner).not.toBeChecked();
    expect(cream).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "클렌저" })).toBeChecked();
  });

  it("전체는 해당 대분류만 선택하거나 해제한다", async () => {
    render(<Options />);
    const group = within(screen.getByRole("button", { name: "스킨케어" }).closest("li")!);
    const all = group.getByRole("checkbox", { name: "전체" });
    expect(all).not.toBeChecked();
    await userEvent.click(all);
    expect(all).toBeChecked();
    expect(group.getByRole("checkbox", { name: "토너" })).toBeChecked();
    expect(group.getByRole("checkbox", { name: "크림" })).toBeChecked();
    await userEvent.click(all);
    expect(group.getByRole("checkbox", { name: "토너" })).not.toBeChecked();
    expect(group.getByRole("checkbox", { name: "크림" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "클렌저" })).toBeChecked();
  });
});
