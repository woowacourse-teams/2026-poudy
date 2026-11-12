/** @vitest-environment jsdom */
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Page from "./page";

import { PopularDupes } from "@/components/similar-products/PopularDupes";
import type { PopularDupe } from "@/lib/domain/popular-dupes";

vi.mock("@/components/similar-products/SimilarProductsStart", () => ({
  SimilarProductsStart: ({ popularDupes }: { readonly popularDupes: readonly PopularDupe[] }) => (
    <PopularDupes items={popularDupes} />
  ),
}));

afterEach(() => vi.unstubAllEnvs());

const links = () =>
  within(screen.getByRole("region", { name: "요즘 많이 찾는 저렴이" }))
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"));

describe("유사템 시작 페이지의 환경별 저렴이", () => {
  it("staging은 새 세 조합과 검증한 기준 구성품으로 연결한다", () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
    render(<Page />);

    expect(links()).toEqual([
      "/similar-products/873?sort=UNIT_PRICE_ASC&partId=767",
      "/similar-products/2115?sort=UNIT_PRICE_ASC&partId=2070",
      "/similar-products/1838?sort=UNIT_PRICE_ASC&partId=1832",
    ]);
    expect(screen.getByText("50% 저렴")).toBeInTheDocument();
    expect(screen.getByText("66.9% 저렴")).toBeInTheDocument();
    expect(screen.getByText("10.34% 저렴")).toBeInTheDocument();
  });

  it.each(["production", "development", undefined])("%s에서는 기존 운영 조합을 유지한다", (environment) => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);
    render(<Page />);

    expect(links()).toEqual([
      "/similar-products/135?sort=UNIT_PRICE_ASC&partId=113",
      "/similar-products/35?sort=UNIT_PRICE_ASC&partId=25",
      "/similar-products/182?sort=UNIT_PRICE_ASC&partId=153",
    ]);
    expect(screen.getByText("45.83% 저렴")).toBeInTheDocument();
  });
});
