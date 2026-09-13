/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductViewRecorder } from "./ProductViewRecorder";

import { recordProductView } from "@/lib/api/products";

vi.mock("@/lib/api/products", () => ({ recordProductView: vi.fn() }));

beforeEach(() => {
  vi.mocked(recordProductView).mockReset().mockResolvedValue();
});

describe("제품 조회 기록", () => {
  it("같은 화면의 effect 재실행과 재렌더링에서는 한 번만 기록한다", async () => {
    const view = render(
      <StrictMode>
        <ProductViewRecorder productId={1} />
      </StrictMode>,
    );

    await vi.waitFor(() => expect(recordProductView).toHaveBeenCalledTimes(1));

    view.rerender(
      <StrictMode>
        <ProductViewRecorder productId={1} />
      </StrictMode>,
    );
    expect(recordProductView).toHaveBeenCalledTimes(1);
  });

  it("다른 제품으로 이동하거나 다시 방문하면 새 조회로 기록한다", async () => {
    const view = render(<ProductViewRecorder productId={1} />);

    view.rerender(<ProductViewRecorder productId={2} />);
    view.rerender(<ProductViewRecorder productId={1} />);

    await vi.waitFor(() => expect(vi.mocked(recordProductView).mock.calls).toEqual([[1], [2], [1]]));
  });

  it("기록 요청이 실패해도 렌더링 오류를 만들지 않는다", async () => {
    vi.mocked(recordProductView).mockRejectedValueOnce(new Error("network error"));

    expect(() => render(<ProductViewRecorder productId={1} />)).not.toThrow();
    await vi.waitFor(() => expect(recordProductView).toHaveBeenCalledOnce());
  });
});
