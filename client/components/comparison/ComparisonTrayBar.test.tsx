/** @vitest-environment jsdom */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { ComparisonToggle } from "./ComparisonToggle";
import { ComparisonTrayReserve, ProductDetailComparisonTray } from "./ComparisonTrayBar";

import { ProductScrollState } from "@/components/product/ProductScrollState";
import { addComparisonItem, getComparisonTraySnapshot, refreshComparisonTray } from "@/lib/storage/comparison-tray";

const item = (productId: number) => ({ productId, name: `제품 ${productId}`, brandName: "브랜드", imageUrl: "" });

const view = (productId = 1) =>
  render(
    <ToastProvider>
      <ProductScrollState>
        <ComparisonToggle item={item(productId)} />
        <ComparisonTrayReserve />
        <ProductDetailComparisonTray />
      </ProductScrollState>
    </ToastProvider>,
  );

const toggle = () => screen.getByRole("button", { name: "비교함에 담기" });

beforeEach(() => {
  window.localStorage.clear();
  refreshComparisonTray();
  navigation.push.mockClear();
});

describe("비교함 담기와 띠", () => {
  it("띠의 칸에서 제품을 빼면 그 제품만 빠지고, 마지막 제품을 빼면 띠가 사라진다", async () => {
    addComparisonItem(item(1));
    addComparisonItem(item(2));
    view(3);

    await userEvent.click(screen.getByRole("button", { name: "제품 1 빼기" }));

    expect(screen.queryByRole("button", { name: "제품 1 빼기" })).not.toBeInTheDocument();
    expect(getComparisonTraySnapshot().items.map(({ productId }) => productId)).toEqual([2]);

    await userEvent.click(screen.getByRole("button", { name: "제품 2 빼기" }));

    expect(screen.queryByRole("region", { name: "비교함" })).not.toBeInTheDocument();
  });

  it("담기 전에는 띠가 없고, 누르면 담기고 다시 누르면 빠진다", async () => {
    view();
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "비교함" })).not.toBeInTheDocument();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "비교함" })).toBeInTheDocument();

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "비교함" })).not.toBeInTheDocument();
  });

  it("담기 전에도 띠의 자리를 비워 두어, 담고 빼도 흐름 안의 높이가 바뀌지 않는다", async () => {
    const { container } = view();
    const reserve = () => container.querySelector("[data-comparison-reserve]");
    const before = reserve();
    expect(before).toHaveClass("invisible");

    await userEvent.click(toggle());
    expect(reserve()).toBe(before);
    // 띠는 높이 없는 자리에 띄워 흐름을 밀지 않는다.
    expect(screen.getByRole("region", { name: "비교함" }).parentElement?.parentElement).toHaveClass("h-0");
  });

  it("칸은 자리로 구분해 담을 때 빈 칸이 옆으로 밀리지 않는다", async () => {
    addComparisonItem(item(2));
    view();
    const slots = () =>
      within(screen.getByRole("region", { name: "비교함" })).getAllByRole("listitem", { hidden: true });
    const [first, second, third] = slots();

    await userEvent.click(toggle());
    expect(slots()).toEqual([first, second, third]);
    expect(second).not.toHaveAttribute("aria-hidden");
  });

  it("하나만 담으면 비교하기를 누를 수 없고, 둘이면 비교 화면으로 간다", async () => {
    addComparisonItem(item(2));
    view();
    await userEvent.click(toggle());
    await userEvent.click(toggle());
    expect(screen.getByRole("button", { name: "비교하기" })).toBeDisabled();

    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole("button", { name: "비교하기" }));
    expect(navigation.push).toHaveBeenCalledWith("/compare/result?productIds=2,1");
  });

  it("문의 버튼이 따라 움직이도록 지금 뜬 모양을 표시한다", async () => {
    const { container } = view();
    const float = () => container.querySelector("[data-comparison-float]");

    expect(float()).toBeNull();

    await userEvent.click(toggle());
    expect(float()).toHaveAttribute("data-comparison-float", "tray");

    await userEvent.click(screen.getByRole("button", { name: "비교함 접기" }));
    expect(float()).toHaveAttribute("data-comparison-float", "pill");
  });

  it("하단 바와 상관없이 띠의 아래 여백이 같아, 바가 오르내려도 높이를 다시 알리지 않는다", async () => {
    addComparisonItem(item(1));
    view();

    const row = screen.getByRole("region", { name: "비교함" }).firstElementChild?.firstElementChild;
    expect(row).toHaveClass("pb-2");
    expect(row).not.toHaveClass("pb-safe");
  });

  it("×는 띠를 알약으로 접을 뿐 담은 제품을 비우지 않고, 알약을 누르면 다시 펼친다", async () => {
    addComparisonItem(item(1));
    addComparisonItem(item(2));
    view();

    await userEvent.click(screen.getByRole("button", { name: "비교함 접기" }));
    expect(screen.queryByRole("region", { name: "비교함" })).not.toBeInTheDocument();
    expect(getComparisonTraySnapshot().items).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "비교함 펼치기, 담은 제품 2개" }));
    expect(screen.getByRole("region", { name: "비교함" })).toBeInTheDocument();
  });

  it("세 개가 찼으면 담지 않고 토스트로 알리며, 비교함 보기로 비교 화면에 간다", async () => {
    [1, 2, 3].forEach((id) => addComparisonItem(item(id)));
    view(4);

    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(getComparisonTraySnapshot().items).toHaveLength(3);
    expect(await screen.findByText("비교함이 가득 찼어요")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "비교함 보기" }));
    expect(navigation.push).toHaveBeenCalledWith("/compare/result?productIds=1,2,3");
  });
});
