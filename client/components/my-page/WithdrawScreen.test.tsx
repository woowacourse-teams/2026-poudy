/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { WithdrawScreen } from "./WithdrawScreen";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("탈퇴하기", () => {
  it("안내를 확인했다고 체크해야 탈퇴할 수 있고, 탈퇴하면 홈으로 보낸다", async () => {
    const user = userEvent.setup();
    const withdraw = vi.fn();
    server.use(
      http.delete("*/api/users/me", () => {
        withdraw();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<WithdrawScreen />, { wrapper: ToastProvider });
    expect(screen.getByText("선반에 올린 제품과 평가")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "탈퇴하기" });
    expect(button).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("checkbox", { name: "위 내용을 확인했고, 탈퇴할게요" }));
    await user.click(button);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(withdraw).toHaveBeenCalledTimes(1);
    expect(screen.getByText("탈퇴했어요. 그동안 고마웠어요")).toBeInTheDocument();
  });
});
