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

  it("조건에 맞는 제품이 없으면 버튼을 누를 수 없다", async () => {
    countIs(0);
    searchParams.current = new URLSearchParams("includeIngredientIds=6");

    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    const button = await screen.findByRole("button", { name: "0개 조건에 맞는 제품 보기" });
    expect(button).toBeDisabled();
    // 감싼 링크는 그대로 두되 눌러도 넘어가지 않아야 한다.
    expect(button.closest("a")).toHaveAttribute("aria-disabled", "true");
  });

  it("개수를 세는 동안에는 버튼을 누를 수 없다", () => {
    // 응답을 주지 않아 세는 중인 상태로 둔다.
    server.use(http.get("*/api/products/count", () => new Promise(() => {})));
    searchParams.current = new URLSearchParams("includeIngredientIds=6");

    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    const button = screen.getByRole("button", { name: "조건에 맞는 제품 보기" });
    expect(button).toBeDisabled();
    expect(button.closest("a")).toHaveAttribute("aria-disabled", "true");
  });

  it("조건을 바꾸면 새 개수가 들어오기 전까지 이전 개수로 넘어가지 못한다", async () => {
    countIs(7);
    searchParams.current = new URLSearchParams("includeIngredientIds=6");

    const { rerender } = render(<IngredientSearchScreen excludeCodes={excludeCodes} />);
    expect(await screen.findByRole("button", { name: "7개 조건에 맞는 제품 보기" })).toBeEnabled();

    // 새 조건의 개수는 아직 오지 않는다. 화면의 7개는 이미 지난 조건의 값이다.
    server.use(http.get("*/api/products/count", () => new Promise(() => {})));
    searchParams.current = new URLSearchParams("includeIngredientIds=6&excludeIngredientIds=8");
    rerender(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    const button = screen.getByRole("button", { name: "7개 조건에 맞는 제품 보기" });
    expect(button).toBeDisabled();
    expect(button.closest("a")).toHaveAttribute("aria-disabled", "true");
  });

  it("개수가 바뀌어도 낭독기에는 완성된 문구 하나만 전한다", async () => {
    countIs(1234);
    searchParams.current = new URLSearchParams("includeIngredientIds=6");

    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    // 다이얼은 자리마다 0-9 를 모두 그린다. 그 숫자가 이름에 섞이면 뜻이 되지 않는다.
    expect(await screen.findByRole("button", { name: "1,234개 조건에 맞는 제품 보기" })).toBeInTheDocument();
  });
});
