/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import { BackForwardCacheSync } from "./BackForwardCacheSync";

const pageShow = (persisted: boolean) => {
  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: persisted });
  window.dispatchEvent(event);
};

beforeEach(() => {
  navigation.refresh.mockClear();
});

describe("BackForwardCacheSync", () => {
  it("bfcache 에서 되살아난 페이지는 회원 상태를 다시 불러온다", () => {
    render(<BackForwardCacheSync />);

    pageShow(true);

    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  it("새로 연 페이지는 다시 불러오지 않는다", () => {
    render(<BackForwardCacheSync />);

    pageShow(false);

    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});
