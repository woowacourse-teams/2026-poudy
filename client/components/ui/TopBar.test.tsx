/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TopBar } from "./TopBar";

const back = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
}));

const setHistoryLength = (length: number) => {
  Object.defineProperty(window.history, "length", { configurable: true, value: length });
};

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
});

describe("TopBar 뒤로 가기", () => {
  it("이전 화면이 있으면 그 화면으로 돌아간다", async () => {
    setHistoryLength(2);
    render(<TopBar title="제품 상세" variant="sub" />);

    await userEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("공유 링크로 바로 들어와 이전 화면이 없으면 메인으로 간다", async () => {
    setHistoryLength(1);
    render(<TopBar title="제품 상세" variant="sub" />);

    await userEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));

    expect(replace).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });
});
