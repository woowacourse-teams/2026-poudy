/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("목록 결과 헤더의 정렬", () => {
  it("결과 수 옆의 정렬 드롭다운에서 고르면 주소의 정렬을 바꾼다", async () => {
    const user = userEvent.setup();
    render(<ProductList excludeCodes={[]} empty={<p>조건에 맞는 제품이 없어요</p>} />);

    const trigger = await screen.findByRole("button", { name: "기본순" });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");

    await user.click(screen.getByRole("option", { name: "가격 낮은순", hidden: true }));

    // 조건은 서버를 다녀오지 않고 주소만 바꾼다(useFilterQuery).
    expect(new URL(window.location.href).searchParams.get("sort")).toBe("PRICE_ASC");
  });
});
