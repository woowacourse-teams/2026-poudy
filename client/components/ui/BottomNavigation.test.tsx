/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BottomNavigation } from "./BottomNavigation";

const postMessage = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

beforeEach(() => {
  postMessage.mockClear();
  Object.defineProperty(window, "ReactNativeWebView", {
    configurable: true,
    value: { postMessage },
  });
});

describe("BottomNavigation 앱 햅틱", () => {
  it("하단 메뉴를 누르면 앱에 선택 햅틱을 요청한다", async () => {
    render(<BottomNavigation />);

    await userEvent.click(screen.getByRole("link", { name: "홈" }));

    expect(postMessage).toHaveBeenCalledWith("poudy:haptic:selection");
  });
});
