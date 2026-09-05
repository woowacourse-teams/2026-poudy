/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorScreen from "./error";

const { reportBoundaryError } = vi.hoisted(() => ({ reportBoundaryError: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/analytics/report-error", () => ({ reportBoundaryError }));

describe("Error", () => {
  it("루트 레이아웃이 유지하는 하단 내비게이션을 중복해서 그리지 않는다", () => {
    render(<ErrorScreen error={new Error("실패")} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "문제가 생겼어요" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "주요 메뉴" })).not.toBeInTheDocument();
  });
});
