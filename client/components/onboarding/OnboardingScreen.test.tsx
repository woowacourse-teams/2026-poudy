/**
 * @vitest-environment jsdom
 */
import type { MemberResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { OnboardingScreen } from "./OnboardingScreen";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const member = (profile: Pick<MemberResponse, "gender" | "ageRange" | "skinType">): MemberResponse => ({
  id: 1,
  provider: "KAKAO",
  email: "member@example.com",
  ...profile,
});

const renderWith = async (profile: Pick<MemberResponse, "gender" | "ageRange" | "skinType">) => {
  server.use(http.get("*/api/members/me", () => HttpResponse.json(member(profile))));
  render(<OnboardingScreen />);
  const loaded = profile.gender ?? profile.ageRange ?? profile.skinType;
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

  it("피부 타입을 잘 모르겠다고 고른 것도 다시 누르면 선택이 풀린다", async () => {
    const user = userEvent.setup();
    await renderWith({ gender: null, ageRange: null, skinType: "UNKNOWN" });
    const unknown = screen.getByRole("radio", { name: "내 피부 타입을 잘 모르겠어요" });
    expect(unknown).toBeChecked();

    await user.click(unknown);

    expect(unknown).not.toBeChecked();
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
});
