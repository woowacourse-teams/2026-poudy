/**
 * @vitest-environment jsdom
 */
import type { UserResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
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

    render(<ProfileFieldScreen field="ageRange" />, { wrapper: ToastProvider });

    expect(await screen.findByRole("radio", { name: "20대" })).toBeChecked();
  });

  it("아직 고른 값이 없으면 하나를 고를 때까지 저장할 수 없다", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
    render(<ProfileFieldScreen field="skinType" />, { wrapper: ToastProvider });

    const dry = await screen.findByRole("radio", { name: /건성/ });
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");

    await user.click(dry);

    expect(screen.getByRole("button", { name: "저장" })).not.toHaveAttribute("aria-disabled");
  });

  it("저장된 값에서 바꾼 것이 없으면 저장할 수 없다", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
    render(<ProfileFieldScreen field="ageRange" />, { wrapper: ToastProvider });

    const twenties = await screen.findByRole("radio", { name: "20대" });
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("radio", { name: "30대" }));
    expect(screen.getByRole("button", { name: "저장" })).not.toHaveAttribute("aria-disabled");

    await user.click(twenties);
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
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
    render(<ProfileFieldScreen field="skinType" />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("radio", { name: /건성/ }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/my-page"));
    expect(sent).toHaveBeenCalledWith({ gender: "FEMALE", ageRange: "TWENTIES", skinType: "DRY", sensitiveSkin: null });
  });

  it("피부 타입과 민감한지를 따로 골라 함께 보낸다", async () => {
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
    render(<ProfileFieldScreen field="skinType" />, { wrapper: ToastProvider });

    expect(await screen.findByRole("radio", { name: /건성/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "네, 민감해요" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/my-page"));
    expect(sent).toHaveBeenCalledWith({ gender: "FEMALE", ageRange: "TWENTIES", skinType: "DRY", sensitiveSkin: true });
  });

  it("저장된 민감성 여부를 골라 둔 채 연다", async () => {
    server.use(http.get("*/api/users/me", () => HttpResponse.json({ ...member, sensitiveSkin: false })));
    render(<ProfileFieldScreen field="skinType" />, { wrapper: ToastProvider });

    expect(await screen.findByRole("radio", { name: "아니요" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "네, 민감해요" })).not.toBeChecked();
  });

  it("마이페이지에서 들어왔으면 저장한 뒤 앞 화면으로 돌아간다", async () => {
    const user = userEvent.setup();
    history.inSite = true;
    server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
    render(<ProfileFieldScreen field="gender" />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("radio", { name: "남성" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("바꾼 것이 없으면 [저장]을 눌러도 보내지 않는다", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    server.use(
      http.get("*/api/users/me", () => HttpResponse.json(member)),
      http.patch("*/api/users/me/profile", () => {
        update();
        return HttpResponse.json(member);
      }),
    );
    render(<ProfileFieldScreen field="gender" />, { wrapper: ToastProvider });

    await screen.findByRole("radio", { name: "여성" });
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(update).not.toHaveBeenCalled();
  });

  it("저장하지 못하면 토스트로 알리고 고른 값은 그대로 둔다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/users/me", () => HttpResponse.json(member)),
      http.patch("*/api/users/me/profile", () => HttpResponse.json({ code: "INTERNAL" }, { status: 500 })),
    );
    render(<ProfileFieldScreen field="gender" />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("radio", { name: "남성" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("저장하지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "남성" })).toBeChecked();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("회원 정보를 읽지 못하면 오류를 알리고 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get("*/api/users/me", () =>
        fail ? HttpResponse.json({ code: "INTERNAL" }, { status: 500 }) : HttpResponse.json(member),
      ),
    );
    render(<ProfileFieldScreen field="ageRange" />, { wrapper: ToastProvider });

    await screen.findByRole("heading", { name: "회원 정보를 불러오지 못했어요" });
    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("radio", { name: "20대" })).toBeChecked();
  });
});
