// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLoginScreen } from "./AdminLoginScreen";

const { router, login, session, replaceLocation } = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  login: vi.fn(),
  session: vi.fn(),
  replaceLocation: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./useAdminSession", () => ({ useAdminSession: session }));
vi.mock("@/lib/api/admin", () => ({ adminLogin: login }));

beforeEach(() => {
  vi.clearAllMocks();
  session.mockReturnValue("signedOut");
  login.mockResolvedValue(undefined);
  vi.stubGlobal("location", { replace: replaceLocation });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("관리자 로그인 후 이동", () => {
  it.each([false, true])("Swagger 복귀 여부가 %s이면 해당 화면으로 이동한다", async (returnToSwagger) => {
    const user = userEvent.setup();
    render(<AdminLoginScreen returnToSwagger={returnToSwagger} />);
    await user.type(screen.getByLabelText("아이디"), "admin");
    await user.type(screen.getByLabelText("비밀번호"), "password");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("admin", "password"));
    if (returnToSwagger) {
      await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/api/admin/swagger-ui.html"));
      expect(router.replace).not.toHaveBeenCalled();
      return;
    }
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
    expect(replaceLocation).not.toHaveBeenCalled();
  });

  it("이미 로그인한 상태로 Swagger 복귀 링크를 열면 바로 Swagger로 이동한다", async () => {
    session.mockReturnValue("signedIn");
    render(<AdminLoginScreen returnToSwagger />);
    await waitFor(() => expect(replaceLocation).toHaveBeenCalledWith("/api/admin/swagger-ui.html"));
    expect(login).not.toHaveBeenCalled();
  });
});
