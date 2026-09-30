import { describe, expect, it } from "vitest";

import { createActiveTimeMeter, IDLE_TIMEOUT_MS } from "./active-time";

const setup = ({ visible = true, focused = true } = {}) => {
  let time = 0;
  const meter = createActiveTimeMeter({ now: () => time, visible, focused });
  const advance = (ms: number) => {
    time += ms;
  };
  return { meter, advance };
};

describe("createActiveTimeMeter", () => {
  it("보이고 포커스가 있으면 들어온 뒤 60초까지는 입력 없이도 센다", () => {
    const { meter, advance } = setup();

    advance(45_000);

    expect(meter.take()).toEqual({ active_seconds: 45, elapsed_seconds: 45, max_scroll_percentage: 0 });
  });

  it("마지막 입력 뒤 60초가 지나면 더 세지 않는다", () => {
    const { meter, advance } = setup();

    advance(30_000);
    meter.input();
    advance(IDLE_TIMEOUT_MS + 50_000);

    expect(meter.take()).toMatchObject({ active_seconds: 90, elapsed_seconds: 140 });
  });

  it("자리를 비웠다가 다시 입력하면 그때부터 이어 센다", () => {
    const { meter, advance } = setup();

    advance(200_000);
    meter.input();
    advance(10_000);

    expect(meter.take()).toMatchObject({ active_seconds: 70 });
  });

  it("탭이 가려진 동안은 세지 않는다", () => {
    const { meter, advance } = setup();

    advance(10_000);
    meter.setVisible(false);
    advance(20_000);
    meter.setVisible(true);
    meter.input();
    advance(5_000);

    expect(meter.take()).toMatchObject({ active_seconds: 15, elapsed_seconds: 35 });
  });

  it("창에 포커스가 없으면 세지 않는다", () => {
    const { meter, advance } = setup({ focused: false });

    advance(10_000);
    meter.setFocused(true);
    advance(3_000);

    expect(meter.take()).toMatchObject({ active_seconds: 3 });
  });

  it("가져간 뒤에는 늘어난 만큼만 돌려주고 1초 미만은 다음으로 넘긴다", () => {
    const { meter, advance } = setup();

    advance(10_400);
    expect(meter.take()).toMatchObject({ active_seconds: 10 });

    advance(500);
    expect(meter.take()).toBeUndefined();

    advance(10_100);
    // 10.4 + 0.5 + 10.1 = 21초를 두 번에 나눠 10 + 11 로 돌려준다.
    expect(meter.take()).toMatchObject({ active_seconds: 11, elapsed_seconds: 21 });
  });

  it("스크롤 깊이는 가장 깊이 내려간 값을 0~100 정수로 남긴다", () => {
    const { meter, advance } = setup();

    meter.scroll(42.6);
    meter.scroll(20);
    advance(1_000);
    expect(meter.take()).toMatchObject({ max_scroll_percentage: 43 });

    meter.scroll(130);
    advance(1_000);
    expect(meter.take()).toMatchObject({ max_scroll_percentage: 100 });
  });
});
