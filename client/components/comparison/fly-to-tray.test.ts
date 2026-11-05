/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { flyToComparisonTray } from "./fly-to-tray";

const rect = (size: number) => ({ left: 0, top: 0, width: size, height: size, right: size, bottom: size }) as DOMRect;

const setup = () => {
  document.body.innerHTML = `<img id="source" src="/a.png" /><ul><li data-comparison-slot="1"><img id="slot" src="/a.png" /></li></ul>`;
  const source = document.querySelector<HTMLImageElement>("#source");
  const slot = document.querySelector<HTMLImageElement>("#slot");
  if (!source || !slot) throw new Error("이미지가 없다.");
  source.getBoundingClientRect = () => rect(184);
  slot.getBoundingClientRect = () => rect(28);
  return { source, slot };
};

const reduced = (matches: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

describe("flyToComparisonTray", () => {
  const animate = vi.fn();
  let finish: () => void;

  beforeEach(() => {
    animate.mockReset();
    animate.mockImplementation(() => ({ finished: new Promise<void>((resolve) => (finish = resolve)) }));
    Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;
    reduced(false);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("사본을 칸까지 날리고, 끝나면 사본을 지운다", async () => {
    const { source } = setup();
    flyToComparisonTray(source, 1);

    const flying = document.querySelector<HTMLImageElement>("img[aria-hidden='true']");
    expect(flying?.style.position).toBe("fixed");
    expect(animate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(animate.mock.calls[0][0])).toContain("rotate(360deg)");

    finish();
    await vi.waitFor(() => expect(document.querySelector("img[aria-hidden='true']")).toBeNull());
  });

  it("움직임 줄이기에서는 날리지 않는다", () => {
    reduced(true);
    const { source } = setup();
    flyToComparisonTray(source, 1);

    expect(animate).not.toHaveBeenCalled();
    expect(document.querySelector("img[aria-hidden='true']")).toBeNull();
  });

  it("들어갈 자리가 없으면 날리지 않는다", () => {
    const { source } = setup();
    flyToComparisonTray(source, 2);

    expect(animate).not.toHaveBeenCalled();
  });
});
