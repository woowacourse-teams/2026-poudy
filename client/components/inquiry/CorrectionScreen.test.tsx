/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CorrectionScreen } from "./CorrectionScreen";

const requestProductCorrection = vi.fn();
const track = vi.fn();

vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  requestProductCorrection: (...args: unknown[]) => requestProductCorrection(...args),
}));
vi.mock("@/lib/analytics/track", () => ({ track: (...args: unknown[]) => track(...args) }));

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), replace }) }));

const CONTENT = "여기에는 나이아신아마이드가 빠져 있어요.";

const setup = () => {
  const user = userEvent.setup();
  render(<CorrectionScreen productId={123} brandName="라운드랩" productName="1025 독도 토너 200ml" imageUrl="" />);
  return user;
};

beforeEach(() => {
  vi.clearAllMocks();
  requestProductCorrection.mockResolvedValue(undefined);
});

describe("제품 정보 정정(S40e)", () => {
  it("유형 버튼 없이 정정할 제품과 제보 내용 칸을 보여 준다", () => {
    setup();

    expect(screen.getByRole("heading", { name: "제품 정보가 정확하지 않나요?" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "정정할 제품" })).toHaveTextContent("라운드랩1025 독도 토너 200ml");
    expect(screen.getByRole("button", { name: "문의 접수하기" })).toHaveAttribute("aria-disabled", "true");
  });

  it("제품 ID 를 주소에 담아 보내고, 확인을 누르면 제품 상세로 돌아간다", async () => {
    const user = setup();
    await user.type(screen.getByLabelText(/제보 내용/), CONTENT);
    await user.click(screen.getByRole("button", { name: "문의 접수하기" }));

    expect(requestProductCorrection).toHaveBeenCalledWith({ productId: 123, content: CONTENT, imageIds: [] });
    expect(track).toHaveBeenCalledWith("inquiry_submitted", {
      inquiry_type: "product_correction",
      image_count: 0,
      has_origin_path: true,
      product_id: 123,
    });
    expect(await screen.findByText("제품 정보 정정")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(replace).toHaveBeenCalledWith("/products/123");
  });
});
