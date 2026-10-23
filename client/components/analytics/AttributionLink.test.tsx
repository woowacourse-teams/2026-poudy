/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onNavigate,
  }: {
    readonly href: string;
    readonly children: ReactNode;
    readonly onNavigate?: (event: { preventDefault: () => void }) => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        if (!event.metaKey && !event.ctrlKey) onNavigate?.({ preventDefault: () => undefined });
      }}
    >
      {children}
    </a>
  ),
}));

import { AttributionLink } from "./AttributionLink";

import { readPageEntry } from "@/lib/analytics/page-entry";
import { readProductEntry } from "@/lib/analytics/product-entry";

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

it("페이지 유입 정보는 이동할 때 저장하고 링크에는 포함하지 않는다", () => {
  render(
    <AttributionLink href="/ingredients/9" entryPoint="ingredient_sheet">
      성분
    </AttributionLink>,
  );
  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", "/ingredients/9");
  fireEvent.click(link, { metaKey: true });
  window.history.replaceState({}, "", "/ingredients/9");
  expect(readPageEntry()).toBeUndefined();
  fireEvent.click(link);
  expect(readPageEntry()).toBe("ingredient_sheet");
});

it("구성품을 고른 제품 링크도 partId는 유지하고 유입 경로를 복원한다", () => {
  render(
    <AttributionLink href="/products/7?partId=11" entryPoint="similar_product">
      제품
    </AttributionLink>,
  );
  fireEvent.click(screen.getByRole("link"));
  window.history.replaceState({}, "", "/products/7?partId=11");
  expect(readProductEntry(7, "direct")).toBe("similar_product");
});
