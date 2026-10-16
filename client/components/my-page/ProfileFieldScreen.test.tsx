/**
 * @vitest-environment jsdom
 */
import type { UserResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileFieldScreen } from "./ProfileFieldScreen";

import { server } from "@/mocks/server";

const { router } = vi.hoisted(() => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { history } = vi.hoisted(() => ({ history: { inSite: false } }));

vi.mock("@/lib/navigation/history-depth", () => ({ hasInSiteHistory: () => history.inSite }));

const member: UserResponse = {
  id: 1,
  provider: "KAKAO",
  email: "member@example.com",
  gender: "FEMALE",
  ageRange: "TWENTIES",
  skinType: null,
  sensitiveSkin: null,
};

describe("내 정보 한 항목 바꾸기", () => {
  beforeEach(() => {
    history.inSite = false;
    vi.clearAllMocks();
  });

  it("지금 저장된 값을 골라 둔 채 연다", async () => {
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));

    render(<ProfileFieldScreen field="ageRange" />);

    expect(await screen.findByRole("radio", { name: "20대" })).toBeChecked();
  });

  it("아직 고른 값이 없으면 하나를 고를 때까지 저장할 수 없다", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
    render(<ProfileFieldScreen field="skinType" />);

    const dry = await screen.findByRole("radio", { name: /건성/ });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    await user.click(dry);

    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("저장된 값에서 바꾼 것이 없으면 저장할 수 없다", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
    render(<ProfileFieldScreen field="ageRange" />);

    const twenties = await screen.findByRole("radio", { name: "20대" });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "30대" }));
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();

    await user.click(twenties);
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("바꾼 항목만 새 값으로 보내고 다른 항목은 그대로 두고 마이페이지로 돌아간다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get("*/api/users/me", () => HttpResponse.json(member)),
      http.patch("*/api/users/me/profile", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        sent(body);
        return HttpResponse.json({ ...member, ...body });
      }),
    );
    render(<ProfileFieldScreen field="skinType" />);

    await user.click(await screen.findByRole("radio", { name: /건성/ }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/my-page"));
    expect(sent).toHaveBeenCalledWith({ gender: "FEMALE", ageRange: "TWENTIES", skinType: "DRY", sensitiveSkin: null });
  });

  it("민감성을 고르면 피부 타입 대신 민감성 여부로 보낸다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get("*/api/users/me", () => HttpResponse.json({ ...member, skinType: "DRY" })),
      http.patch("*/api/users/me/profile", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        sent(body);
        return HttpResponse.json({ ...member, ...body });
      }),
    );
    render(<ProfileFieldScreen field="skinType" />);

    await user.click(await screen.findByRole("radio", { name: /민감성/ }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/my-page"));
    expect(sent).toHaveBeenCalledWith({ gender: "FEMALE", ageRange: "TWENTIES", skinType: null, sensitiveSkin: true });
  });

  it("민감성 여부가 참이면 민감성을 고른 것으로 보여 준다", async () => {
    server.use(http.get("*/api/users/me", () => HttpResponse.json({ ...member, sensitiveSkin: true })));
    render(<ProfileFieldScreen field="skinType" />);

    expect(await screen.findByRole("radio", { name: /민감성/ })).toBeChecked();
  });

  it("마이페이지에서 들어왔으면 저장한 뒤 앞 화면으로 돌아간다", async () => {
    const user = userEvent.setup();
    history.inSite = true;
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
    render(<ProfileFieldScreen field="gender" />);

    await user.click(await screen.findByRole("radio", { name: "남성" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
