/** @vitest-environment jsdom */
import type { UserResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignupIdentityScreen } from "./SignupIdentityScreen";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const member: UserResponse = {
  id: 1,
  provider: "KAKAO",
  email: "otter@example.com",
  nickname: "포근한 수달 1000",
  profileImageUrl: null,
  gender: "FEMALE",
  ageRange: "TWENTIES",
  skinType: "DRY",
  sensitiveSkin: true,
  profileSetupCompleted: false,
};
const open = async () => {
  render(<SignupIdentityScreen />, { wrapper: ToastProvider });
  return screen.findByPlaceholderText(member.nickname);
};

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
});

describe("가입 프로필 설정", () => {
  it("닉네임과 사진만 묻고 닉네임 옆에 선택 표시를 붙이지 않는다", async () => {
    const input = await open();
    expect(input).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "닉네임" })).toBe(input);
    expect(input).not.toHaveAttribute("aria-required", "true");
    expect(screen.queryByText("선택", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "건너뛰기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("기본 닉네임을 그대로 쓰더라도 다음을 누르면 서버에 완료를 기록한다", async () => {
    const user = userEvent.setup();
    let saved: unknown;
    server.use(
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ ...member, profileSetupCompleted: true });
      }),
    );
    await open();
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(saved).toEqual({
        gender: "FEMALE",
        ageRange: "TWENTIES",
        skinType: "DRY",
        sensitiveSkin: true,
        profileSetupCompleted: true,
      }),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/signup/skin"));
  });

  it("닉네임을 저장한 다음 피부 정보로 가고 기존 피부 값은 보존한다", async () => {
    const user = userEvent.setup();
    let saved: unknown;
    server.use(
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ ...member, nickname: "산뜻한 수달" });
      }),
    );
    await user.type(await open(), "산뜻한 수달");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(saved).toEqual({
        gender: "FEMALE",
        ageRange: "TWENTIES",
        skinType: "DRY",
        sensitiveSkin: true,
        profileSetupCompleted: true,
        nickname: "산뜻한 수달",
      }),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/signup/skin"));
  });

  it("중복이면 이유와 입력값을 남기고 다음 단계로 이동하지 않는다", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch("*/api/users/me/profile", () =>
        HttpResponse.json(
          { title: "Conflict", status: 409, code: "NICKNAME_ALREADY_EXISTS", detail: "이미 사용 중인 닉네임입니다." },
          { status: 409 },
        ),
      ),
    );
    const input = await open();
    await user.type(input, "이미 있는 닉네임");
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
    expect(input).toHaveValue("이미 있는 닉네임");
    expect(router.push).not.toHaveBeenCalled();
  });
});
