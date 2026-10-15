/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { WithdrawScreen } from "./WithdrawScreen";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("탈퇴하기", () => {
  it("안내를 확인했다고 체크해야 탈퇴할 수 있고, 탈퇴하면 로그인 화면으로 보낸다", async () => {
    const user = userEvent.setup();
    const withdraw = vi.fn();
    server.use(
      http.delete("*/api/users/me", () => {
        withdraw();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<WithdrawScreen />);
    const button = screen.getByRole("button", { name: "탈퇴하기" });
    expect(button).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "위 내용을 확인했고, 탈퇴할게요" }));
    await user.click(button);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(withdraw).toHaveBeenCalledTimes(1);
  });
});
