/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SearchShell, useSearchTopBarAction } from "./SearchShell";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/search/products" } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => pathname.current,
}));

/** 상단 내비에 글자 행동을 맡기는 화면. 누를 때마다 늘어나는 수를 보여, 마지막 동작이 불리는지 본다. */
function ScreenWithAction({ show }: { readonly show: boolean }) {
  const [count, setCount] = useState(0);
  useSearchTopBarAction(show ? { text: "초기화", onClick: () => setCount(count + 1) } : undefined);
  return <p>누른 횟수 {count}</p>;
}

describe("SearchShell", () => {
  beforeEach(() => {
    pathname.current = "/search/products";
  });

  it("주소에 맞는 검색 모드 탭을 지금 화면으로 둔다", () => {
    pathname.current = "/search/ingredients";
    render(<SearchShell>화면</SearchShell>);

    expect(screen.getByRole("heading", { name: "탐색 조건 설정" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "성분 필터링", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "제품명 검색" })).not.toHaveAttribute("aria-current");
  });

  it("화면이 맡긴 글자 행동을 상단 내비에 두고, 누르면 화면의 마지막 동작을 부른다", async () => {
    const view = render(
      <SearchShell>
        <ScreenWithAction show />
      </SearchShell>,
    );

    await userEvent.click(screen.getByRole("button", { name: "초기화" }));
    await userEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(screen.getByText("누른 횟수 2")).toBeInTheDocument();

    view.rerender(
      <SearchShell>
        <ScreenWithAction show={false} />
      </SearchShell>,
    );
    expect(screen.queryByRole("button", { name: "초기화" })).not.toBeInTheDocument();
  });
});
