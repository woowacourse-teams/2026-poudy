/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BackForwardCacheSync } from "./BackForwardCacheSync";

import { reloadSavedProducts } from "@/lib/storage/saved-products";

vi.mock("@/lib/storage/saved-products", () => ({ reloadSavedProducts: vi.fn(() => Promise.resolve()) }));

const pageShow = (persisted: boolean) => {
  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: persisted });
  window.dispatchEvent(event);
};

beforeEach(() => {
  vi.mocked(reloadSavedProducts).mockClear();
});

describe("BackForwardCacheSync", () => {
  it("bfcache 에서 되살아난 페이지는 저장함 회원 상태를 다시 불러온다", () => {
    render(<BackForwardCacheSync />);

    pageShow(true);

    expect(reloadSavedProducts).toHaveBeenCalledTimes(1);
  });

  it("새로 연 페이지는 다시 불러오지 않는다", () => {
    render(<BackForwardCacheSync />);

    pageShow(false);

    expect(reloadSavedProducts).not.toHaveBeenCalled();
  });
});
