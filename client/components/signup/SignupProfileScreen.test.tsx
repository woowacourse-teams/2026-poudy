/**
 * @vitest-environment jsdom
 */
import type { UserResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { SignupProfileScreen } from "./SignupProfileScreen";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

// 저장 실패 응답이면 API 클라이언트가 오류 이벤트를 보내려고 track 을 동적으로 불러온다.
// 그 불러오기가 테스트 환경이 정리된 뒤에 끝나 EnvironmentTeardownError 가 나므로 미리 바꿔 둔다.
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

type Profile = Pick<UserResponse, "gender" | "ageRange" | "skinType"> & Partial<Pick<UserResponse, "sensitiveSkin">>;

const member = (profile: Profile): UserResponse => ({
  id: 1,
  provider: "KAKAO",
  email: "member@example.com",
  nickname: "포근한 다람쥐 1000",
  profileImageUrl: null,
  sensitiveSkin: null,
  ...profile,
});

const renderWith = async (profile: Profile) => {
  server.use(http.get("*/api/users/me", () => HttpResponse.json(member(profile))));
  render(<SignupProfileScreen />, { wrapper: ToastProvider });
  const loaded = [profile.gender, profile.ageRange, profile.skinType, profile.sensitiveSkin].some(
    (value) => value !== null && value !== undefined,
  );
  if (loaded) {
    await waitFor(() => expect(screen.getByRole("button", { name: "시작하기" })).not.toHaveAttribute("aria-disabled"));
  }
};

describe("피부 정보 설정", () => {
  it("고른 성별을 다시 누르면 선택이 풀리고 시작 버튼이 다시 잠긴다", async () => {
    const user = userEvent.setup();
    await renderWith({ gender: "FEMALE", ageRange: null, skinType: null });
    const female = screen.getByRole("radio", { name: "여성" });
    expect(female).toBeChecked();

    await user.click(female);

    expect(female).not.toBeChecked();
    expect(screen.getByRole("button", { name: "하나 이상 골라 주세요" })).toHaveAttribute("aria-disabled", "true");
  });

  it("고른 나이대와 피부 타입도 다시 누르면 선택이 풀린다", async () => {
    const user = userEvent.setup();
    await renderWith({ gender: null, ageRange: "TWENTIES", skinType: "COMBINATION" });
    const twenties = screen.getByRole("radio", { name: "20대" });
    const combination = screen.getByRole("radio", { name: /복합성/ });

    await user.click(twenties);
    await user.click(combination);

    expect(twenties).not.toBeChecked();
    expect(combination).not.toBeChecked();
  });

  it("다른 항목을 누르면 선택이 그 항목으로 옮겨 간다", async () => {
    const user = userEvent.setup();
    await renderWith({ gender: "FEMALE", ageRange: null, skinType: null });
    const female = screen.getByRole("radio", { name: "여성" });
    const male = screen.getByRole("radio", { name: "남성" });

    await user.click(male);

    expect(female).not.toBeChecked();
    expect(male).toBeChecked();
  });

  it("피부 타입과 민감한지를 따로 고르고 따로 저장한다", async () => {
    const user = userEvent.setup();
    let saved: unknown = null;
    server.use(
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json(
          member({ gender: null, ageRange: null, skinType: "COMBINATION", sensitiveSkin: true }),
        );
      }),
    );
    await renderWith({ gender: null, ageRange: null, skinType: null });

    await user.click(screen.getByRole("radio", { name: /복합성/ }));
    await user.click(screen.getByRole("radio", { name: "네, 민감해요" }));
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    await waitFor(() =>
      expect(saved).toEqual({ gender: null, ageRange: null, skinType: "COMBINATION", sensitiveSkin: true }),
    );
  });

  it("민감한지만 답해도 시작할 수 있고, 다시 누르면 답이 풀린다", async () => {
    const user = userEvent.setup();
    await renderWith({ gender: null, ageRange: null, skinType: null, sensitiveSkin: false });
    const notSensitive = screen.getByRole("radio", { name: "아니요" });
    expect(notSensitive).toBeChecked();

    await user.click(notSensitive);

    expect(notSensitive).not.toBeChecked();
    expect(screen.getByRole("button", { name: "하나 이상 골라 주세요" })).toHaveAttribute("aria-disabled", "true");
  });

  it("저장하지 못하면 토스트로 알리고 다시 누를 수 있게 둔다", async () => {
    const user = userEvent.setup();
    server.use(http.patch("*/api/users/me/profile", () => HttpResponse.json({}, { status: 500 })));
    await renderWith({ gender: "FEMALE", ageRange: null, skinType: null });

    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(await screen.findByText("저장하지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시작하기" })).not.toHaveAttribute("aria-busy");
  });
});
