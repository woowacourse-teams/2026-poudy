/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientTopBar } from "./IngredientTopBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}));

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(window, "ReactNativeWebView", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});

describe("성분 설명 상단 내비", () => {
  it("공유 버튼 이름에 대상을 담고, 주소를 복사하면 토스트로 알린다", async () => {
    render(
      <ToastProvider>
        <IngredientTopBar title="성분 설명" shareName="판테놀" />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "판테놀 공유" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.href}?share=true`);
    expect(await screen.findByText("주소를 복사했어요")).toBeInTheDocument();
  });

  it("공유할 대상이 없으면 공유 버튼을 두지 않고, 바 제목을 대표 제목으로 둘 수 있다", () => {
    render(
      <ToastProvider>
        <IngredientTopBar title="성분 설명" titleAs="h1" />
      </ToastProvider>,
    );

    expect(screen.queryByRole("button", { name: /공유/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "성분 설명" })).toBeInTheDocument();
  });
});
