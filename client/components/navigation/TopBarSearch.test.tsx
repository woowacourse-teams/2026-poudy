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
  it.each(["/", "/products", "/products/12", "/categories", "/categories/1", "/brands", "/brands/1"])(
    "제품을 찾는 화면 %s 의 상단 내비는 검색 화면으로 가는 링크를 둔다",
    (path) => {
      renderBar(path);

      expect(screen.getByRole("link", { name: "검색" })).toHaveAttribute("href", "/search/products");
    },
  );

  it.each([
    "/pouch",
    "/routines",
    "/routines/3",
    "/my-page",
    "/youtubers",
    "/ingredients/5",
    "/compare/result",
    "/products/12/missing",
  ])("제품을 찾는 화면이 아닌 %s 에는 링크를 두지 않는다", (path) => {
    renderBar(path);

    expect(screen.queryByRole("link", { name: "검색" })).not.toBeInTheDocument();
  });

  it.each(["/search/products", "/search/ingredients"])("검색 화면 %s 에는 링크를 두지 않는다", (path) => {
    renderBar(path);

    expect(screen.queryByRole("link", { name: "검색" })).not.toBeInTheDocument();
  });
});
