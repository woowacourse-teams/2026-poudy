/**
 * @vitest-environment jsdom
 */
import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { routerReplace, listeners } = vi.hoisted(() => {
  const listeners = new Set<() => void>();

  return { routerReplace: vi.fn(), listeners };
});

/** 목의 history 가로채기. 진짜 App Router 가 하는 일을 대신한다. */
const patchHistory = () => {
  const original = window.history.replaceState.bind(window.history);

  window.history.replaceState = ((...args: Parameters<typeof original>) => {
    original(...args);
    listeners.forEach((listen) => listen());
  }) as typeof original;

  return () => {
    window.history.replaceState = original;
  };
};

/*
 * searchParams 를 고정값으로 두지 않고 진짜 주소를 보게 한다. 이 화면이 주소를 직접
 * 갈아 끼우고 그 값을 곧바로 다시 읽어 오는지가 확인할 것이기 때문이다.
 *
 * App Router 는 history API 를 가로채 두어 `replaceState` 뒤에 `useSearchParams` 를
 * 다시 그린다. 목에는 그 장치가 없어 여기서 흉내 낸다. 이것을 빠뜨리면 주소만 바뀌고
 * 화면이 따라오지 않아, 실제로는 되는 흐름이 테스트에서만 깨진다.
 */
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");

  return {
    useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (listen: () => void) => {
            listeners.add(listen);
            return () => listeners.delete(listen);
          },
          () => window.location.search,
          () => "",
        ),
      ),
  };
});
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { IngredientSearchScreen } from "./IngredientSearchScreen";

import { server } from "@/mocks/server";

const excludeCodes: readonly ExcludeCodeResponse[] = [];

const footer = () => screen.getByRole("button", { name: /제품 보기/ });

describe("조건을 누른 뒤 화면이 따라오는 흐름", () => {
  let restoreHistory = () => {};

  beforeEach(() => {
    routerReplace.mockClear();
    window.history.replaceState(null, "", "/search/ingredients");
    restoreHistory = patchHistory();
  });

  afterEach(() => restoreHistory());

  it("포함을 누르면 버튼이 그 자리에서 눌린 모양이 된다", async () => {
    server.use(http.get("*/api/products/count", () => HttpResponse.json({ count: 7 })));
    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "판");
    const list = await screen.findByRole("list", { name: "성분 검색 결과" }, { timeout: 4000 });
    const row = within(list).getAllByRole("listitem")[0];
    const include = within(row).getByRole("button", { name: /포함$/ });

    await userEvent.click(include);

    // 서버를 다녀오지 않고 바로 바뀐다.
    expect(routerReplace).not.toHaveBeenCalled();
    await waitFor(() => expect(include).toHaveAttribute("aria-pressed", "true"));
  });

  it("개수가 도착하기 전에는 아래 버튼을 누를 수 없다", async () => {
    // 응답을 주지 않아 세는 중인 상태로 둔다.
    server.use(http.get("*/api/products/count", () => new Promise(() => {})));
    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "판");
    const list = await screen.findByRole("list", { name: "성분 검색 결과" }, { timeout: 4000 });
    const row = within(list).getAllByRole("listitem")[0];
    await userEvent.click(within(row).getByRole("button", { name: /포함$/ }));

    await waitFor(() => expect(footer()).toBeInTheDocument());
    expect(footer()).toBeDisabled();
  });

  it("개수가 도착하면 아래 버튼이 열리고 그 수를 말한다", async () => {
    server.use(http.get("*/api/products/count", () => HttpResponse.json({ count: 7 })));
    render(<IngredientSearchScreen excludeCodes={excludeCodes} />);

    await userEvent.type(screen.getByRole("searchbox", { name: "성분 검색" }), "판");
    const list = await screen.findByRole("list", { name: "성분 검색 결과" }, { timeout: 4000 });
    const row = within(list).getAllByRole("listitem")[0];
    await userEvent.click(within(row).getByRole("button", { name: /포함$/ }));

    const button = await screen.findByRole("button", { name: "7개 조건에 맞는 제품 보기" }, { timeout: 4000 });
    // 개수 요청은 디바운스를 거치므로 열릴 때까지 기다린다.
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 4000 });
  });
});
