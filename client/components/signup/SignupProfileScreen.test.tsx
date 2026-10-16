/**
 * @vitest-environment jsdom
 */
import type { UserResponse } from "@poudy/api/api.zod";
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

type Profile = Pick<UserResponse, "gender" | "ageRange" | "skinType"> & Partial<Pick<UserResponse, "sensitiveSkin">>;

const member = (profile: Profile): UserResponse => ({
  id: 1,
  provider: "KAKAO",
  email: "member@example.com",
  sensitiveSkin: null,
  ...profile,
});

const renderWith = async (profile: Profile) => {
  server.use(http.get("*/api/users/me", () => HttpResponse.json(member(profile))));
  render(<SignupProfileScreen />);
  const loaded = [profile.gender, profile.ageRange, profile.skinType, profile.sensitiveSkin].some(
    (value) => value !== null && value !== undefined,
  );
  if (loaded) {
    await waitFor(() => expect(screen.getByRole("button", { name: "시작하기" })).toBeEnabled());
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
    expect(screen.getByRole("button", { name: "하나 이상 골라 주세요" })).toBeDisabled();
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
    expect(screen.getByRole("button", { name: "하나 이상 골라 주세요" })).toBeDisabled();
  });
});
