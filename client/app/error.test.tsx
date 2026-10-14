/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorScreen from "./error";

const { reportBoundaryError, reloadForStaleBuild } = vi.hoisted(() => ({
  reportBoundaryError: vi.fn(),
  reloadForStaleBuild: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/analytics/report-error", () => ({ reportBoundaryError }));
vi.mock("@/lib/navigation/stale-build", () => ({ reloadForStaleBuild }));

describe("Error", () => {
  it("루트 레이아웃이 유지하는 하단 내비게이션을 중복해서 그리지 않는다", () => {
    render(<ErrorScreen error={new Error("실패")} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "문제가 생겼어요" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "주요 메뉴" })).not.toBeInTheDocument();
  });

  it("화면을 무너뜨린 오류로 지난 빌드인지 확인해 새로 읽게 한다", () => {
    const error = new Error("module factory is not available");
    render(<ErrorScreen error={error} retry={vi.fn()} />);

    expect(reloadForStaleBuild).toHaveBeenCalledWith(error);
  });
});
