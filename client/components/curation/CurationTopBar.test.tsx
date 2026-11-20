/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurationTopBar } from "./CurationTopBar";

import { markPop, markPush } from "@/lib/navigation/history-depth";

const back = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, replace }),
}));

/* 테스트에는 앱 라우터가 없다. 기록을 바꿔 끼우는 링크인지 보도록 replace 를 앵커의 data 속성으로 옮긴다. */
vi.mock("next/link", () => ({
  default: ({ replace: swap, ...props }: ComponentProps<"a"> & { readonly replace?: boolean }) => (
    <a {...props} data-replace={swap ? "" : undefined} />
  ),
}));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  [1, 2, 3, 4, 5].forEach(() => markPop());
});

const renderBar = () => render(<CurationTopBar title="가을 장벽 기획전" />, { wrapper: ToastProvider });

describe("큐레이션 상세 상단 바 뒤로 가기", () => {
  it("사이트 안에서 옮겨 온 뒤에는 이전 화면으로 돌아간다", async () => {
    markPush();
    renderBar();

    await userEvent.click(screen.getByRole("button", { name: "이전 화면" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("공유 링크로 바로 들어오면 홈으로 바꿔 끼우는 링크가 된다", () => {
    renderBar();

    const link = screen.getByRole("link", { name: "홈으로" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("data-replace");
  });

  it("오른쪽의 공유 행동은 그대로 둔다", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "공유하기" })).toBeInTheDocument();
  });
});
