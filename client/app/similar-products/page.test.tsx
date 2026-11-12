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

describe("유사템 시작 페이지의 공통 저렴이와 환경별 ID", () => {
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

  it.each(["production", "development", undefined])("%s에서는 같은 세 조합을 운영 ID로 연결한다", (environment) => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);
    render(<Page />);

    expect(links()).toEqual([
      "/similar-products/834?sort=UNIT_PRICE_ASC&partId=724",
      "/similar-products/2076?sort=UNIT_PRICE_ASC&partId=1977",
      "/similar-products/1838?sort=UNIT_PRICE_ASC&partId=1739",
    ]);
    expect(screen.getByText("후시덤 베리어 리페어 크림 마스크")).toBeInTheDocument();
    expect(screen.getByText("비플레인 시카테롤 캡슐 베리어 크림")).toBeInTheDocument();
    expect(screen.getByText("넘버즈인 3번 도자기결 톤업베이지 선크림 SPF50+ PA++++ (블러/글로우)")).toBeInTheDocument();
    expect(screen.getByText("50% 저렴")).toBeInTheDocument();
    expect(screen.getByText("66.9% 저렴")).toBeInTheDocument();
    expect(screen.getByText("10.34% 저렴")).toBeInTheDocument();
  });
});
