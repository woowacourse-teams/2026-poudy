/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reportBoundaryError } from "./report-error";
import { track } from "./track";

vi.mock("./track", () => ({ track: vi.fn() }));

const captureException = vi.fn();

beforeEach(() => {
  vi.mocked(track).mockClear();
  captureException.mockClear();
  window.posthog = { capture: vi.fn(), captureException };
});

describe("reportBoundaryError", () => {
  it("digest 를 오류 코드로 남긴다. 서버 로그와 맞추는 열쇠다", () => {
    reportBoundaryError(Object.assign(new Error("실패"), { digest: "abc123" }), "route");

    expect(track).toHaveBeenCalledWith("error_occurred", {
      error_code: "abc123",
      status: 0,
      surface: "route",
    });
  });

  it("digest 가 없으면 오류 이름으로 남긴다", () => {
    reportBoundaryError(new TypeError("잘못된 값"), "global");

    expect(track).toHaveBeenCalledWith("error_occurred", {
      error_code: "TypeError",
      status: 0,
      surface: "global",
    });
  });

  it("스택을 함께 보려고 예외 자체도 보낸다", () => {
    const error = new Error("실패");
    reportBoundaryError(error, "route");

    expect(captureException).toHaveBeenCalledWith(error, { surface: "route" });
  });

  it("PostHog 가 아직 없어도 터지지 않는다", () => {
    delete window.posthog;

    expect(() => reportBoundaryError(new Error("실패"), "route")).not.toThrow();
  });
});
