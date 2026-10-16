/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { SignupSheet } from "./SignupSheet";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));

// 요청이 실패하면 api client 가 분석 모듈을 늦게 불러온다. 테스트가 끝난 뒤 불러오지 않게 미리 바꿔 둔다.
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams("signup=required"),
}));

describe("가입 확인 시트", () => {
  it("만 14세 이상을 체크해야 가입할 수 있고, 가입하면 가입 정보 입력으로 간다", async () => {
    const user = userEvent.setup();
    render(<SignupSheet />);
    const submit = await screen.findByRole("button", { name: "동의하고 계속" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "만 14세 이상이에요" }));
    await user.click(submit);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/signup/profile"));
  });

  it("가입하지 못하면 다시 시도하라고 알린다", async () => {
    server.use(http.post("*/api/auth/signup", () => HttpResponse.json({}, { status: 500 })));
    const user = userEvent.setup();
    render(<SignupSheet />);

    await user.click(await screen.findByRole("checkbox", { name: "만 14세 이상이에요" }));
    await user.click(screen.getByRole("button", { name: "동의하고 계속" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("가입하지 못했어요. 잠시 후 다시 시도해 주세요.");
  });
});
