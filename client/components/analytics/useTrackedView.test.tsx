/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { useTrackedView } from "./useTrackedView";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track }));

function Result({ resultKey, ready }: { readonly resultKey: string; readonly ready: boolean }) {
  useTrackedView(
    "product_list_viewed",
    { source: "category", result_count: 0, condition_count: 1 },
    { key: resultKey, enabled: ready },
  );
  return null;
}

beforeEach(() => track.mockClear());

it("준비된 결과만 Strict Mode에서 한 번 세고 새 결과는 다시 센다", () => {
  const view = render(
    <StrictMode>
      <Result resultKey="a" ready={false} />
    </StrictMode>,
  );
  expect(track).not.toHaveBeenCalled();
  view.rerender(
    <StrictMode>
      <Result resultKey="a" ready />
    </StrictMode>,
  );
  view.rerender(
    <StrictMode>
      <Result resultKey="a" ready />
    </StrictMode>,
  );
  expect(track).toHaveBeenCalledTimes(1);
  view.rerender(
    <StrictMode>
      <Result resultKey="b" ready />
    </StrictMode>,
  );
  expect(track).toHaveBeenCalledTimes(2);
});
