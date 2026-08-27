/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAnalyticsTag } from "./GoogleAnalyticsTag";

const googleAnalytics = vi.hoisted(() => vi.fn(() => null));

vi.mock("@next/third-parties/google", () => ({ GoogleAnalytics: googleAnalytics }));

const setDoNotTrack = (value: string | null): void => {
  Object.defineProperty(navigator, "doNotTrack", { configurable: true, value });
};

describe("GoogleAnalyticsTag", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    setDoNotTrack(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    googleAnalytics.mockClear();
  });

  it("운영 측정 ID로 Google 태그를 렌더링한다", () => {
    render(<GoogleAnalyticsTag />);

    expect(googleAnalytics).toHaveBeenCalledWith({ gaId: "G-TEST123" }, undefined);
  });

  it.each(["development", "staging"])("%s 환경에서는 Google 태그를 렌더링하지 않는다", (environment) => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment);

    render(<GoogleAnalyticsTag />);

    expect(googleAnalytics).not.toHaveBeenCalled();
  });

  it("측정 ID가 없으면 Google 태그를 렌더링하지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");

    render(<GoogleAnalyticsTag />);

    expect(googleAnalytics).not.toHaveBeenCalled();
  });

  it.each(["1", "yes"])("Do Not Track 값이 %s이면 Google 태그를 렌더링하지 않는다", (doNotTrack) => {
    setDoNotTrack(doNotTrack);

    render(<GoogleAnalyticsTag />);

    expect(googleAnalytics).not.toHaveBeenCalled();
  });
});
