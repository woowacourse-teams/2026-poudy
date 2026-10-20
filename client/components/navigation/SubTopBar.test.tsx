/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubTopBar } from "./SubTopBar";

import { markPop, markPush } from "@/lib/navigation/history-depth";

const back = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
}));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  [1, 2, 3, 4, 5].forEach(() => markPop());
});

describe("SubTopBar 뒤로가기", () => {
  it("사이트 안에서 옮겨 온 뒤에는 이전 화면으로 돌아간다", async () => {
    markPush();
    render(<SubTopBar title="이용약관" />);

    await userEvent.click(screen.getByRole("button", { name: "이전 화면" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("밖에서 바로 들어오면 홈으로 가는 링크를 보여 준다", () => {
    render(<SubTopBar title="이용약관" />);

    expect(screen.queryByRole("button", { name: "이전 화면" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("제목을 화면의 대표 제목으로 둔다", () => {
    render(<SubTopBar title="이용약관" />);

    expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).toBeInTheDocument();
  });
});
