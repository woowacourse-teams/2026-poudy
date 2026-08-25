/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LevelRange } from "./LevelRangeOptions";

const { requestSelectionHaptic } = vi.hoisted(() => ({ requestSelectionHaptic: vi.fn() }));

vi.mock("@/lib/interaction/haptic", () => ({ requestSelectionHaptic }));

/** 단계는 없음 · 낮음 · 보통 · 높음 네 칸이다. */
const step = (name: string) => screen.getByRole("button", { name: `수분 ${name}` });

const TRACK_LEFT = 0;
const TRACK_WIDTH = 300;

/**
 * 트랙을 가로 300px 로 세운다. jsdom 은 배치를 계산하지 않아 폭이 0 이므로
 * 손가락 위치에서 단계를 읽으려면 크기를 직접 일러 주어야 한다.
 */
const track = () => {
  const element = screen.getByRole("group", { name: "수분 범위" });

  element.getBoundingClientRect = () =>
    ({
      left: TRACK_LEFT,
      width: TRACK_WIDTH,
      right: TRACK_LEFT + TRACK_WIDTH,
      top: 0,
      bottom: 24,
      height: 24,
      x: TRACK_LEFT,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  // jsdom 에는 포인터 붙잡기가 없다. 끌기가 시작만 되면 되므로 비워 둔다.
  element.setPointerCapture = () => {};
  element.releasePointerCapture = () => {};

  return element;
};

/** 단계 한복판의 가로 좌표. 0 번은 왼쪽 끝, 마지막은 오른쪽 끝이다. */
const xOf = (level: number) => TRACK_LEFT + (TRACK_WIDTH * level) / 3;

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

  it("상관없음에서 처음 고르면 없음부터 그 자리까지 잡는다", async () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[]} onChange={onChange} />);

    await userEvent.click(step("보통"));

    expect(onChange).toHaveBeenCalledWith([0, 1, 2]);
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(1);
  });

  it("상관없음에서 없음을 고르면 없음만 남는다", async () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[]} onChange={onChange} />);

    await userEvent.click(step("없음"));

    expect(onChange).toHaveBeenCalledWith([0]);
  });

  it("손가락으로 끌면 지나는 단계마다 알린다", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<LevelRange label="수분" levels={[0]} onChange={onChange} />);
    const element = track();

    // 없음에서 잡아 높음까지 끈다. 세 칸을 지난다.
    fireEvent.pointerDown(element, { pointerId: 1, clientX: xOf(0) });
    for (const level of [1, 2, 3]) {
      fireEvent.pointerMove(element, { pointerId: 1, clientX: xOf(level) });
      // 부모가 값을 돌려주는 것처럼 다시 그린다.
      rerender(<LevelRange label="수분" levels={onChange.mock.lastCall?.[0] ?? [0]} onChange={onChange} />);
    }
    fireEvent.pointerUp(element, { pointerId: 1 });

    expect(onChange).toHaveBeenLastCalledWith([0, 1, 2, 3]);
    // 잡을 때 한 번, 칸을 지날 때마다 한 번씩.
    expect(requestSelectionHaptic).toHaveBeenCalledTimes(4);
  });

  it("같은 칸 안에서 손가락이 흔들려도 다시 알리지 않는다", () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[0, 1]} onChange={onChange} />);
    const element = track();

    fireEvent.pointerDown(element, { pointerId: 1, clientX: xOf(1) });
    const afterGrab = requestSelectionHaptic.mock.calls.length;

    // 같은 칸 안에서 몇 픽셀 움직인다.
    fireEvent.pointerMove(element, { pointerId: 1, clientX: xOf(1) + 4 });
    fireEvent.pointerMove(element, { pointerId: 1, clientX: xOf(1) - 4 });
    fireEvent.pointerUp(element, { pointerId: 1 });

    expect(requestSelectionHaptic).toHaveBeenCalledTimes(afterGrab);
  });

  it("끌기를 마친 뒤 클릭이 한 번 더 반영되지 않는다", () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[0, 1]} onChange={onChange} />);
    const element = track();

    fireEvent.pointerDown(element, { pointerId: 1, clientX: xOf(3) });
    fireEvent.pointerUp(element, { pointerId: 1 });
    const afterDrag = onChange.mock.calls.length;

    // 브라우저는 끌기 뒤에도 click 을 한 번 더 보낸다.
    fireEvent.click(step("높음"));

    expect(onChange).toHaveBeenCalledTimes(afterDrag);
  });

  it("상관없음에서 끌어 잡으면 없음부터 그 자리까지 잡는다", () => {
    const onChange = vi.fn();
    render(<LevelRange label="수분" levels={[]} onChange={onChange} />);
    const element = track();

    fireEvent.pointerDown(element, { pointerId: 1, clientX: xOf(2) });
    fireEvent.pointerUp(element, { pointerId: 1 });

    expect(onChange).toHaveBeenCalledWith([0, 1, 2]);
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
