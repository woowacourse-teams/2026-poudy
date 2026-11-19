/** @vitest-environment jsdom */
import type { RoutineSummaryResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { RoutineScreen } from "./RoutineScreen";

import type { RoutineListState } from "@/lib/hooks/useRoutinePages";

const { useMyRoutines } = vi.hoisted(() => ({ useMyRoutines: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/hooks/useRoutines", () => ({ useMyRoutines }));
vi.mock("./RoutineBrowseList", () => ({ RoutineBrowseList: () => null }));

const routine = (id: number): RoutineSummaryResponse => ({
  id,
  name: `루틴 ${id}`,
  isPublic: id % 2 === 0,
  likeCount: 0,
  commentCount: 0,
  morning: [],
  evening: [],
});

const respondWith = (state: RoutineListState<RoutineSummaryResponse>) =>
  useMyRoutines.mockReturnValue({ state, retry: vi.fn(), loadMore: vi.fn() });

const ready = (count: number): RoutineListState<RoutineSummaryResponse> => ({
  status: "ready",
  data: {
    items: Array.from({ length: count }, (_, index) => routine(index + 1)),
    page: 1,
    total: count,
    hasNext: false,
    loadingMore: false,
    moreFailed: false,
  },
  revalidating: false,
});

beforeEach(() => respondWith({ status: "loading" }));

it("로그인 전이면 내 루틴 줄 자리에 '내 루틴 만들기' 하나만 둔다", () => {
  respondWith({ status: "signedOut" });
  render(<RoutineScreen />);

  expect(screen.getByRole("button", { name: "내 루틴 만들기" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /전체 보기/ })).not.toBeInTheDocument();
});

it("내 루틴이 3개 이하면 '전체 보기'를 두지 않고 줄 끝에 '새 루틴'을 둔다", () => {
  respondWith(ready(3));
  render(<RoutineScreen />);

  expect(screen.getAllByRole("link", { name: /루틴 \d/ })).toHaveLength(3);
  expect(screen.getByRole("button", { name: "새 루틴" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /전체 보기/ })).not.toBeInTheDocument();
});

it("내 루틴이 3개를 넘으면 '전체 보기'로 내 루틴 전체 화면을 연다", () => {
  respondWith(ready(4));
  render(<RoutineScreen />);

  expect(screen.getByRole("link", { name: /전체 보기/ })).toHaveAttribute("href", "/routines/my");
});

it("상단 오른쪽은 '+' 대신 루틴 이용 안내를 연다", () => {
  respondWith(ready(1));
  render(<RoutineScreen />);

  expect(screen.getByRole("button", { name: "루틴 이용 안내" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "새 루틴 만들기" })).not.toBeInTheDocument();
});
