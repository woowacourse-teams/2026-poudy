/** @vitest-environment jsdom */
import type { RoutineSummaryResponse } from "@poudy/api/api.zod";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { RoutineScreen } from "./RoutineScreen";

import type { RoutineListState } from "@/lib/hooks/useRoutinePages";

const { replace, useMyRoutines } = vi.hoisted(() => ({ replace: vi.fn(), useMyRoutines: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/hooks/useRoutines", () => ({ useMyRoutines }));

const respondWith = (state: RoutineListState<RoutineSummaryResponse>) =>
  useMyRoutines.mockReturnValue({ state, retry: vi.fn(), loadMore: vi.fn() });

beforeEach(() => {
  replace.mockClear();
  respondWith({ status: "loading" });
});

it.each([
  [{ status: "signedOut" }, "/routines/feed"],
  [
    {
      status: "ready",
      data: { items: [], page: 1, total: 0, hasNext: false, loadingMore: false, moreFailed: false },
      revalidating: false,
    },
    "/routines/my",
  ],
] as const)("로그인 응답을 받은 뒤 %s 상태에 맞는 주소로 이동한다", async (state, path) => {
  const view = render(<RoutineScreen />);
  expect(replace).not.toHaveBeenCalled();
  respondWith(state);
  view.rerender(<RoutineScreen />);
  await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith(path));
});
