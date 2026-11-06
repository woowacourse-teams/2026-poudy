/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { reportBoundaryError, reloadForStaleBuild } = vi.hoisted(() => ({
  reportBoundaryError: vi.fn(),
  reloadForStaleBuild: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/analytics/report-error", () => ({ reportBoundaryError }));
vi.mock("@/lib/navigation/stale-build", () => ({ reloadForStaleBuild }));

import ComparisonError from "./error";

describe("제품 비교 오류 화면", () => {
  it("담은 제품이 남아 있다고 알리고, 오류를 남기며, 다시 시도할 수 있다", async () => {
    const error = Object.assign(new Error("실패"), { digest: "7f3a9c" });
    const retry = vi.fn();
    render(<ComparisonError error={error} retry={retry} />);

    expect(screen.getByRole("heading", { name: "제품 비교하기" })).toBeInTheDocument();
    expect(screen.getByText("비교 정보를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByText(/비교함에 담은 제품은 그대로 있어요/)).toBeInTheDocument();
    expect(screen.getByText(/7f3a9c/)).toBeInTheDocument();
    expect(reportBoundaryError).toHaveBeenCalledWith(error, "route");

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
