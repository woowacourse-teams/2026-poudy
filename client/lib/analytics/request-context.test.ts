/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { analyticsRequestHeaders } from "./request-context";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "project-token");
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
  window.posthog = {
    capture: vi.fn(),
    captureException: vi.fn(),
    get_distinct_id: () => "member:7",
    get_session_id: () => "session-1",
    has_opted_out_capturing: () => false,
  };
});
afterEach(() => {
  delete window.posthog;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("실제 브라우저 SDK 식별자와 세션을 서버에 전달한다", () => {
  expect(analyticsRequestHeaders()).toEqual({
    "X-Poudy-Analytics": "1",
    "X-POSTHOG-DISTINCT-ID": "member:7",
    "X-POSTHOG-SESSION-ID": "session-1",
  });
});

it("추적 거부·개발 환경·SDK 미준비에서는 서버 전송을 허용하지 않는다", () => {
  window.posthog!.has_opted_out_capturing = () => true;
  expect(analyticsRequestHeaders()).toEqual({});
  window.posthog!.has_opted_out_capturing = () => false;
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "development");
  expect(analyticsRequestHeaders()).toEqual({});
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
  delete window.posthog;
  expect(analyticsRequestHeaders()).toEqual({});
});
