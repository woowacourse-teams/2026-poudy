/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientSearchScreen } from "./IngredientSearchScreen";

import { excludeCodes } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams.current,
}));

/** 조건에 걸린 제품 수를 정해 둔다. */
const countIs = (count: number) => server.use(http.get("*/api/products/count", () => HttpResponse.json({ count })));

describe("IngredientSearchScreen", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
  });

  it("조건이 없으면 버튼을 보여 주지 않는다", () => {
    countIs(120);
    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    expect(screen.queryByRole("button", { name: /제품 보기/ })).not.toBeInTheDocument();
  });

  it("조건이 걸리면 버튼에 그 조건의 제품 수를 보여 준다", async () => {
    countIs(7);
    searchParams.current = new URLSearchParams("includeIngredientIds=6");

    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    expect(await screen.findByRole("button", { name: "7개 조건에 맞는 제품 보기" })).toBeInTheDocument();
  });

  it("조건이 바뀌면 버튼의 개수도 따라 바뀐다", async () => {
    countIs(7);
    searchParams.current = new URLSearchParams("includeIngredientIds=6");

    const { rerender } = render(<IngredientSearchScreen excludeCodes={excludeCodes} />);
    expect(await screen.findByRole("button", { name: "7개 조건에 맞는 제품 보기" })).toBeInTheDocument();

    // URL 이 바뀐 것처럼 조건을 하나 더 건다.
    countIs(3);
    searchParams.current = new URLSearchParams("includeIngredientIds=6&excludeIngredientIds=8");
    rerender(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    expect(await screen.findByRole("button", { name: "3개 조건에 맞는 제품 보기" })).toBeInTheDocument();
  });
});
