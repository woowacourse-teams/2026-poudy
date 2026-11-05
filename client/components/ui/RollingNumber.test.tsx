/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { landingTurn } from "./RollingDigit";
import { RollingNumber } from "./RollingNumber";

/** 다이얼이 실제로 보여 주는 숫자. 자리마다 밀어 올린 만큼을 읽는다. */
const shownDigits = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-digit]")].map((digit) => digit.dataset.digit).join("");

describe("RollingNumber", () => {
  it("자리마다 0-9 를 모두 세워 두고 해당 숫자만큼 밀어 올린다", () => {
    const { container } = render(<RollingNumber value={7} />);

    expect(shownDigits(container)).toBe("7");
    // 굴러갈 수 있게 열 개가 모두 있어야 한다.
    expect(container.querySelectorAll("[data-digit] > span > span")).toHaveLength(10);
  });

  it("천 단위 쉼표는 굴리지 않는다", () => {
    const { container } = render(<RollingNumber value={1234} />);

    expect(shownDigits(container)).toBe("1234");
    expect(container.textContent).toContain(",");
  });

  it("자릿수가 바뀌어도 뒷자리는 같은 칸에 남는다", () => {
    const { container, rerender } = render(<RollingNumber value={9} />);
    const onesBefore = container.querySelector("[data-place='1']");

    rerender(<RollingNumber value={10} />);

    // 앞자리가 늘어도 일의 자리를 새로 그리지 않는다. 그래야 그 자리만 굴러간다.
    expect(container.querySelector("[data-place='1']")).toBe(onesBefore);
    expect(shownDigits(container)).toBe("10");
  });
});

describe("RollingNumber 가 값을 기다리는 동안", () => {
  const animate = vi.fn();
  const animations: { cancel: ReturnType<typeof vi.fn>; onfinish: (() => void) | null; currentTime: number }[] = [];

  beforeEach(() => {
    animations.length = 0;
    animate.mockReset();
    animate.mockImplementation(() => {
      const animation = { cancel: vi.fn(), onfinish: null, currentTime: 0 };
      animations.push(animation);
      return animation;
    });
    Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;
    vi.stubGlobal(
      "DOMMatrixReadOnly",
      class {
        m42 = 0;
      },
    );
  });

  afterEach(() => {
    delete (Element.prototype as Partial<Element>).animate;
    vi.unstubAllGlobals();
  });

  const keyframes = (call: number) => animate.mock.calls[call][0] as readonly { transform: string }[];

  it("spinning 이 켜지면 자리마다 끊임없이 돈다", () => {
    const { container } = render(<RollingNumber value={12} spinning />);

    expect(container.querySelectorAll("[data-spinning]")).toHaveLength(2);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[0][1]).toMatchObject({ iterations: Infinity });
  });

  it("값을 받으면 되돌아가지 않고 가장 가까운 제 숫자에 멈춘다", () => {
    const { container, rerender } = render(<RollingNumber value={7} spinning />);

    rerender(<RollingNumber value={3} />);

    expect(animations[0].cancel).toHaveBeenCalled();
    expect(keyframes(1).at(-1)).toEqual({ transform: "translateY(-30%)" });
    expect(container.querySelector("[data-spinning]")).toBeNull();
    expect(shownDigits(container)).toBe("3");
  });

  it("도는 동안 전환을 끄고, 멈춘 뒤에 되돌려 다음 값은 다시 굴러간다", () => {
    const { container, rerender } = render(<RollingNumber value={7} spinning />);
    const column = container.querySelector<HTMLElement>("[data-digit] > span");
    expect(column?.style.transition).toBe("none");

    rerender(<RollingNumber value={3} />);
    expect(column?.style.transition).toBe("none");

    act(() => animations[1].onfinish?.());
    expect(column?.style.transition).toBe("");
  });

  it("다시 세기 시작하면 멈추던 움직임을 끊고 이어서 돈다", () => {
    const { rerender } = render(<RollingNumber value={7} spinning />);
    rerender(<RollingNumber value={3} />);

    rerender(<RollingNumber value={3} spinning />);

    expect(animations[1].cancel).toHaveBeenCalled();
    expect(animate).toHaveBeenCalledTimes(3);
    expect(animate.mock.calls[2][1]).toMatchObject({ iterations: Infinity });
  });

  it("동작 줄이기 설정에서는 돌지 않고 숫자만 흐린다", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { container } = render(<RollingNumber value={7} spinning />);

    expect(animate).not.toHaveBeenCalled();
    expect(container.firstElementChild).toHaveClass("motion-reduce:opacity-50");
  });
});

describe("landingTurn", () => {
  it.each([
    [0, 3, 0.3],
    [0.3, 7, 0.7],
    [0.7, 3, 1.3],
    [0.95, 0, 1],
  ])("바퀴 %f 에서 숫자 %i 는 같은 방향으로 가장 가까운 %f 에 멈춘다", (turn, digit, stop) => {
    expect(landingTurn(turn, digit)).toBeCloseTo(stop);
  });

  it("제 숫자가 한 칸도 안 남았으면 한 바퀴 더 돈다", () => {
    expect(landingTurn(0.28, 3)).toBeCloseTo(1.3);
  });

  it("어느 자리에서 시작해도 멈추는 곳은 두 바퀴 세로 줄 안이다", () => {
    for (let digit = 0; digit <= 9; digit += 1) {
      for (let turn = 0; turn < 1; turn += 0.01) {
        const stop = landingTurn(turn, digit);
        expect(stop).toBeGreaterThanOrEqual(turn);
        expect(stop).toBeLessThanOrEqual(1.9);
      }
    }
  });
});

describe("RollingNumber 의 자릿수가 줄 때", () => {
  const animate = vi.fn();
  const fades: { cancel: ReturnType<typeof vi.fn>; onfinish: (() => void) | null }[] = [];

  beforeEach(() => {
    fades.length = 0;
    animate.mockReset();
    animate.mockImplementation(() => {
      const fade = { cancel: vi.fn(), onfinish: null };
      fades.push(fade);
      return fade;
    });
    Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;
  });

  afterEach(() => {
    delete (Element.prototype as Partial<Element>).animate;
  });

  it("없어지는 앞자리를 잠시 남겨 흐리고, 끝나면 지운다", () => {
    const { container, rerender } = render(<RollingNumber value={571} />);

    rerender(<RollingNumber value={3} />);

    expect(shownDigits(container)).toBe("3");
    expect(container.querySelector("[aria-hidden]")?.textContent).toBe("57");
    expect(animate.mock.calls[0][0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);

    act(() => fades[0].onfinish?.());
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });

  it("쉼표까지 함께 흐린다", () => {
    const { container, rerender } = render(<RollingNumber value={1234} />);

    rerender(<RollingNumber value={56} />);

    expect(container.querySelector("[aria-hidden]")?.textContent).toBe("1,2");
  });

  it("자릿수가 같거나 늘면 남기지 않는다", () => {
    const { container, rerender } = render(<RollingNumber value={57} />);

    rerender(<RollingNumber value={12} />);
    rerender(<RollingNumber value={345} />);

    expect(container.querySelector("[aria-hidden]")).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});
