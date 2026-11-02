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
  nickname: "포근한수달1000",
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
    expect(screen.getByRole("button", { name: "바꾼 내용이 없어요" })).toHaveAttribute("aria-disabled", "true");
  });

  it("닉네임을 저장할 때 기존 피부 정보도 함께 보내 보존한다", async () => {
    const user = userEvent.setup();
    let saved: unknown;
    server.use(
      http.patch("*/api/users/me/profile", async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ ...member, nickname: "산뜻한수달" });
      }),
    );
    const input = await open();
    await user.clear(input);
    await user.type(input, "산뜻한수달");
    expect(await screen.findByText("사용할 수 있는 닉네임이에요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(saved).toEqual({
        gender: "FEMALE",
        ageRange: "TWENTIES",
        skinType: "DRY",
        sensitiveSkin: true,
        nickname: "산뜻한수달",
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/my-page"));
  });

  it("닉네임을 바꾸면 입력이 멈춘 뒤 중복을 확인하고, 사용할 수 있을 때만 저장을 연다", async () => {
    const user = userEvent.setup();
    const input = await open();
    await user.clear(input);
    await user.type(input, "산뜻한수달");
    expect(screen.getByText("중복을 확인하고 있어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
    expect(await screen.findByText("사용할 수 있는 닉네임이에요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).not.toHaveAttribute("aria-disabled", "true");
    await user.type(input, "2");
    expect(screen.getByRole("button", { name: "저장" })).toHaveAttribute("aria-disabled", "true");
  });

  it("띄어쓰기나 특수문자가 있으면 입력은 두되 오류를 보여 주고, 중복을 확인하지 않고 저장을 막는다", async () => {
    const user = userEvent.setup();
    const requested: string[] = [];
    server.use(
      http.get("*/api/users/me/nickname-availability", ({ request }) => {
        requested.push(new URL(request.url).searchParams.get("nickname") ?? "");
        return HttpResponse.json({ available: true });
      }),
    );
    const input = await open();
    await user.clear(input);
    await user.type(input, "산뜻한 수달!");
    expect(input).toHaveValue("산뜻한 수달!");
    expect(await screen.findByText("띄어쓰기는 쓸 수 없어요")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "닉네임을 확인해 주세요" })).toHaveAttribute("aria-disabled", "true");
    expect(requested).toEqual([]);
  });

  it("글자마다가 아니라 입력이 멈춘 값으로 한 번만 중복을 확인한다", async () => {
    const user = userEvent.setup();
    const requested: string[] = [];
    server.use(
      http.get("*/api/users/me/nickname-availability", ({ request }) => {
        requested.push(new URL(request.url).searchParams.get("nickname") ?? "");
        return HttpResponse.json({ available: true });
      }),
    );
    const input = await open();
    await user.clear(input);
    await user.type(input, "산뜻한수달");
    await screen.findByText("사용할 수 있는 닉네임이에요.");
    expect(requested).toEqual(["산뜻한수달"]);
  });

  it("이미 쓰는 닉네임이면 이유를 보여 주고 저장을 막는다", async () => {
    const user = userEvent.setup();
    const input = await open();
    await user.clear(input);
    await user.type(input, "이미있는닉네임");
    expect(await screen.findByText("이미 사용 중인 닉네임이에요.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "닉네임을 확인해 주세요" })).toHaveAttribute("aria-disabled", "true");
  });

  it("확인 뒤 다른 회원이 먼저 저장해 충돌하면 이유를 보여 주고 다시 확인하게 한다", async () => {
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
    await user.type(input, "산뜻한수달");
    await screen.findByText("사용할 수 있는 닉네임이에요.");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
    expect(input).toHaveValue("산뜻한수달");
    expect(screen.getByRole("button", { name: "닉네임을 확인해 주세요" })).toHaveAttribute("aria-disabled", "true");
    expect(router.replace).not.toHaveBeenCalled();
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
    await user.type(input, "가나다라마바사아자차카타파하가나");
    expect(await screen.findByText("2~15자로 입력해 주세요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "닉네임을 확인해 주세요" }));
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
    expect(screen.getByRole("button", { name: "사진을 올리는 중이에요" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("사진을 올리고 있어요.")).toBeInTheDocument();
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

  it("업로드가 실패하면 사진에 실패를 표시하고, 사진을 누르면 다시 올린다", async () => {
    const user = userEvent.setup();
    upload.mockRejectedValueOnce(new Error("upload failed")).mockResolvedValueOnce({ imageId });
    await open();
    await user.upload(
      screen.getByLabelText("프로필 사진 선택"),
      new File(["image"], "otter.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByText("사진을 올리지 못했어요. 사진을 누르면 다시 올려요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사진을 확인해 주세요" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "사진 다시 올리기" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장" })).not.toHaveAttribute("aria-disabled", "true"),
    );
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
