/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LevelRange } from "./LevelRangeOptions";

const { requestSelectionHaptic } = vi.hoisted(() => ({ requestSelectionHaptic: vi.fn() }));

vi.mock("@/lib/interaction/haptic", () => ({ requestSelectionHaptic }));

/** 단계는 없음 · 낮음 · 보통 · 높음 네 칸이다. */
const step = (name: string) => screen.getByRole("button", { name: `수분 ${name}` });

describe("LevelRange", () => {
  beforeEach(() => {
    requestSelectionHaptic.mockClear();
  });

  it("단계를 옮기면 손끝에 알린다", async () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[1, 2]} onChange={onChange} />);

    await userEvent.click(step("높음"));

    expect(onChange).toHaveBeenCalledWith([1, 2, 3]);
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });

  it("범위가 그대로면 알리지 않는다", async () => {
    const onChange = vi.fn();
    // 손잡이를 그 자리에 다시 눌러도 옮겨지는 것이 없다.
    render(<LevelRange label="수분" levels={[2]} onChange={onChange} />);

    await userEvent.click(step("보통"));

    expect(onChange).toHaveBeenCalledWith([2]);
    expect(requestSelectionHaptic).not.toHaveBeenCalled();
  });

  it("상관없음을 켜고 끌 때 알린다", async () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[1, 2]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith([]);
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });

  it("상관없음에서 단계를 고르면 그 단계만 남는다", async () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[]} onChange={onChange} />);

    await userEvent.click(step("낮음"));

    expect(onChange).toHaveBeenCalledWith([1]);
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });

  it("키보드로 옮겨도 똑같이 동작한다", async () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[1, 2]} onChange={onChange} />);

    step("높음").focus();
    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith([1, 2, 3]);
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });
});
