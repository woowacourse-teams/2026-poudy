/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon, ICON_NAMES, IconSprite } from "./icon";

describe("Icon", () => {
  it("기본은 20 크기, 선 굵기 2 이고 그림은 보조 기술에서 감춘다", () => {
    const { container } = render(<Icon name="chevron-right" />);
    const svg = container.querySelector("svg")!;

    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("stroke-width", "2");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg.querySelector("use")).toHaveAttribute("href", "#ds-icon-chevron-right");
  });

  it("filled 는 채움 그림을 면으로, bold 는 1.5배 굵기로 그린다", () => {
    const { container } = render(
      <>
        <Icon name="bookmark" size={24} filled />
        <Icon name="x" size={14} bold />
      </>,
    );
    const [filled, bold] = container.querySelectorAll("svg");

    expect(filled.querySelector("use")).toHaveAttribute("href", "#ds-icon-bookmark-filled");
    expect(filled).toHaveAttribute("fill", "currentColor");
    expect(filled).toHaveAttribute("stroke", "none");
    expect(bold).toHaveAttribute("stroke-width", "3");
  });

  it("크기 단계 밖의 크기와 채움 그림이 없는 이름의 filled 는 타입이 막는다", () => {
    // @ts-expect-error 18 은 ICON I02 의 크기 단계가 아니다
    render(<Icon name="x" size={18} />);
    // @ts-expect-error x 에는 채움 그림이 없다
    render(<Icon name="x" filled />);
  });

  it("IconSprite 는 모든 이름의 심볼과 채움 심볼을 한 번씩 그린다", () => {
    const { container } = render(<IconSprite />);
    const ids = [...container.querySelectorAll("symbol")].map((symbol) => symbol.id);

    for (const name of ICON_NAMES) expect(ids).toContain(`ds-icon-${name}`);
    expect(ids).toContain("ds-icon-home-filled");
    expect(new Set(ids).size).toBe(ids.length);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
