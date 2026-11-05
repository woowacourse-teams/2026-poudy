/** @vitest-environment jsdom */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { ComparisonToggle } from "./ComparisonToggle";
import { ComparisonTrayBar } from "./ComparisonTrayBar";

import { ProductScrollState } from "@/components/product/ProductScrollState";
import { addComparisonItem, getComparisonTraySnapshot, refreshComparisonTray } from "@/lib/storage/comparison-tray";

const item = (productId: number) => ({ productId, name: `제품 ${productId}`, brandName: "브랜드", imageUrl: "" });

const view = (productId = 1) =>
  render(
    <ToastProvider>
      <ProductScrollState>
        <ComparisonToggle item={item(productId)} />
        <ComparisonTrayBar />
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

  it("하나만 담으면 비교하기를 누를 수 없고, 둘이면 비교 화면으로 간다", async () => {
    addComparisonItem(item(2));
    view();
    await userEvent.click(toggle());
    await userEvent.click(toggle());
    expect(screen.getByRole("button", { name: "비교하기" })).toBeDisabled();

    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole("button", { name: "비교하기" }));
    expect(navigation.push).toHaveBeenCalledWith("/compare/result");
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
    expect(navigation.push).toHaveBeenCalledWith("/compare/result");
  });
});
