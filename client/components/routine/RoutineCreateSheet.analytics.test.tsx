/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { RoutineCreateSheet } from "./RoutineCreateSheet";

const { createRoutine, track } = vi.hoisted(() => ({ createRoutine: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/api/routine", () => ({ createRoutine }));
vi.mock("@/lib/analytics/track", () => ({ track }));
const created = { id: 12, name: "내 루틴", memo: null, isPublic: false, morning: [], evening: [] };
beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

it("생성 API가 실패하면 생성 완료 이벤트를 보내지 않는다", async () => {
  createRoutine.mockRejectedValue(new Error("unavailable"));
  const onCreated = vi.fn();
  render(<RoutineCreateSheet open onClose={vi.fn()} onCreated={onCreated} />);
  await userEvent.type(screen.getByRole("textbox", { name: "루틴 이름" }), "내 루틴");
  await userEvent.click(screen.getByRole("button", { name: "만들기" }));
  await waitFor(() => expect(createRoutine).toHaveBeenCalledOnce());
  expect(onCreated).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalledWith("routine_created", expect.anything());
});

it("생성 성공 후 빈 루틴임을 기록하고 이름·메모는 보내지 않는다", async () => {
  createRoutine.mockResolvedValue(created);
  render(<RoutineCreateSheet open onClose={vi.fn()} onCreated={vi.fn()} />);
  await userEvent.type(screen.getByRole("textbox", { name: "루틴 이름" }), "내 루틴");
  await userEvent.click(screen.getByRole("button", { name: "만들기" }));
  await waitFor(() =>
    expect(track).toHaveBeenCalledWith(
      "routine_created",
      expect.objectContaining({ routine_id: 12, product_count: 0 }),
    ),
  );
  expect(JSON.stringify(track.mock.calls)).not.toContain("내 루틴");
});
