/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
