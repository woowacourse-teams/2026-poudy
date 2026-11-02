/** @vitest-environment jsdom */
import type { UserResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileScreen } from "./ProfileScreen";

import { server } from "@/mocks/server";

const { router, upload } = vi.hoisted(() => ({
  upload: vi.fn(),
  router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() },
}));
vi.mock("@/lib/api/member", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/member")>()),
  uploadProfileImage: upload,
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/navigation/history-depth", () => ({ hasInSiteHistory: () => false }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const member: UserResponse = {
  id: 42,
  provider: "KAKAO",
  email: "otter@example.com",
  nickname: "포근한 수달 1000",
  profileImageUrl: null,
  gender: "FEMALE",
  ageRange: "TWENTIES",
  skinType: "DRY",
  sensitiveSkin: true,
};
const imageId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  router.replace.mockClear();
  upload.mockReset();
  upload.mockResolvedValue({ imageId });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:profile"), revokeObjectURL: vi.fn() }));
  server.use(http.get("*/api/users/me", () => HttpResponse.json(member)));
});

const open = async () => {
  render(<ProfileScreen />, { wrapper: ToastProvider });
  return screen.findByRole("textbox", { name: "닉네임" });
};

describe("프로필 수정", () => {
  it("현재 닉네임을 채우고, 바뀐 것이 없으면 저장을 막는다", async () => {
    const input = await open();
    expect(input).toHaveValue(member.nickname);
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
  });

  it("닉네임을 저장할 때 기존 피부 정보도 함께 보내 보존한다", async () => {
    const user = userEvent.setup();
    let saved: unknown;
    server.use(
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ ...member, nickname: "산뜻한 수달" });
      }),
    );
    const input = await open();
    await user.clear(input);
    await user.type(input, "산뜻한 수달");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(saved).toEqual({
        gender: "FEMALE",
        ageRange: "TWENTIES",
        skinType: "DRY",
        sensitiveSkin: true,
        nickname: "산뜻한 수달",
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/my-page"));
  });

  it("중복이면 입력란에 이유를 보여 주고 입력값을 남겨 고칠 수 있다", async () => {
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
    await user.clear(input);
    await user.type(input, "이미 있는 닉네임");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
    expect(input).toHaveValue("이미 있는 닉네임");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(router.replace).not.toHaveBeenCalled();
    await user.type(input, "2");
    expect(screen.queryByText("이미 사용 중인 닉네임입니다.")).not.toBeInTheDocument();
  });

  it("유효하지 않은 닉네임은 이유를 알리고 전송을 막는다", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    server.use(
      http.patch("*/api/users/me/profile", () => {
        save();
        return HttpResponse.json(member);
      }),
    );
    const input = await open();
    await user.clear(input);
    await user.type(input, "수달!");
    await user.tab();
    expect(await screen.findByText("한글, 영문, 숫자와 단어 사이 한 칸 공백만 사용할 수 있어요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(save).not.toHaveBeenCalled();
  });

  it("사진 업로드가 끝나기 전에는 저장하지 않고, 받은 ID로 연결한다", async () => {
    const user = userEvent.setup();
    let finish: (() => void) | undefined;
    let saved: unknown;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    upload.mockImplementation(() => pending.then(() => ({ imageId })));
    server.use(
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json(member);
      }),
    );
    await open();
    await user.upload(
      screen.getByLabelText("프로필 사진 선택"),
      new File(["image"], "otter.jpg", { type: "image/jpeg" }),
    );
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
    finish?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장" })).not.toHaveAttribute("aria-disabled", "true"),
    );
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(saved).toEqual({
        gender: "FEMALE",
        ageRange: "TWENTIES",
        skinType: "DRY",
        sensitiveSkin: true,
        profileImageId: imageId,
      }),
    );
  });

  it("사진 삭제는 null로 보내며 다른 값은 그대로 보낸다", async () => {
    const user = userEvent.setup();
    let saved: unknown;
    server.use(
      http.get("*/api/users/me", () =>
        HttpResponse.json({ ...member, profileImageUrl: "https://example.com/otter.jpg" }),
      ),
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json(member);
      }),
    );
    await open();
    await user.click(screen.getByRole("button", { name: "사진 삭제" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(saved).toEqual({
        gender: "FEMALE",
        ageRange: "TWENTIES",
        skinType: "DRY",
        sensitiveSkin: true,
        profileImageId: null,
      }),
    );
  });

  it("업로드가 실패하면 이전 사진을 그대로 두고 다시 선택하도록 안내한다", async () => {
    const user = userEvent.setup();
    upload.mockRejectedValue(new Error("upload failed"));
    await open();
    await user.upload(
      screen.getByLabelText("프로필 사진 선택"),
      new File(["image"], "otter.jpg", { type: "image/jpeg" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "사진을 올리지 못했어요" });
    expect(dialog).toHaveTextContent("잠시 후 사진을 다시 선택해 주세요.");
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "사진 삭제" })).not.toBeInTheDocument();
  });
});
