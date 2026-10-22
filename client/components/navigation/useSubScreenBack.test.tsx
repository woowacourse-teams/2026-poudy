/**
 * @vitest-environment jsdom
 */
import { TopBar } from "@poudy/design-system/top-bar";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type SubScreenFallback, useSubScreenBack } from "./useSubScreenBack";

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

function Bar({ fallback }: { readonly fallback?: SubScreenFallback }) {
  return <TopBar variant="explore" align="start" title="스킨케어" back={useSubScreenBack(fallback)} />;
}

describe("useSubScreenBack", () => {
  it("밖에서 바로 들어오면 넘겨받은 상위 화면으로 가는 링크가 된다", () => {
    render(<Bar fallback={{ href: "/categories", label: "카테고리 전체" }} />);

    expect(screen.getByRole("link", { name: "카테고리 전체" })).toHaveAttribute("href", "/categories");
  });

  it("넘겨받은 곳이 없으면 홈으로 가는 링크가 된다", () => {
    render(<Bar />);

    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("사이트 안에서 옮겨 온 뒤에는 이전 화면으로 돌아간다", async () => {
    markPush();
    render(<Bar fallback={{ href: "/categories", label: "카테고리 전체" }} />);

    await userEvent.click(screen.getByRole("button", { name: "이전 화면" }));

    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });
});
