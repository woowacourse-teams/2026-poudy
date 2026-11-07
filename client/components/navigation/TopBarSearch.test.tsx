/**
 * @vitest-environment jsdom
 */
import { TopBar } from "@poudy/design-system/top-bar";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopBarSearch } from "./TopBarSearch";

const routerState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => routerState.pathname }));

const renderBar = (pathname: string) => {
  routerState.pathname = pathname;
  render(
    <TopBarSearch>
      <TopBar variant="large" title="제목" />
    </TopBarSearch>,
  );
};

describe("TopBarSearch", () => {
  it.each(["/pouch", "/routines", "/my-page", "/products"])(
    "%s 의 상단 내비는 검색 화면으로 가는 링크를 둔다",
    (path) => {
      renderBar(path);

      expect(screen.getByRole("link", { name: "검색" })).toHaveAttribute("href", "/search/products");
    },
  );

  it.each(["/search/products", "/search/ingredients"])("검색 화면 %s 에는 링크를 두지 않는다", (path) => {
    renderBar(path);

    expect(screen.queryByRole("link", { name: "검색" })).not.toBeInTheDocument();
  });
});
