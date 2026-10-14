/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GlobalError from "./global-error";

const { reportBoundaryError, reloadForStaleBuild } = vi.hoisted(() => ({
  reportBoundaryError: vi.fn(),
  reloadForStaleBuild: vi.fn(),
}));

vi.mock("@/lib/analytics/report-error", () => ({ reportBoundaryError }));
vi.mock("@/lib/navigation/stale-build", () => ({ reloadForStaleBuild }));

describe("GlobalError", () => {
  it("화면을 무너뜨린 오류로 지난 빌드인지 확인해 새로 읽게 한다", () => {
    const error = new Error("module factory is not available");
    // html 을 직접 그리는 화면이라 문서에 바로 그린다. div 안에 그리면 React 가 경고한다.
    render(<GlobalError error={error} retry={vi.fn()} />, { container: document });

    expect(reportBoundaryError).toHaveBeenCalledWith(error, "global");
    expect(reloadForStaleBuild).toHaveBeenCalledWith(error);
  });
});
