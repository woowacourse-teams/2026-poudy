/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "./InquiryForm";

import { ApiError } from "@/lib/api/client";

const sendFeedback = vi.fn();
const uploadFeedbackImages = vi.fn();

vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  sendFeedback: (...args: unknown[]) => sendFeedback(...args),
  uploadFeedbackImages: (...args: unknown[]) => uploadFeedbackImages(...args),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

const CONTENT = "열 자가 넘는 문의 내용입니다";

const png = (name = "shot.png", size = 1000) => {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const attach = async (user: ReturnType<typeof userEvent.setup>, files: File[]) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, files);
};

const start = async () => {
  const user = userEvent.setup();
  render(<InquiryForm originPath="/" />);
  await user.click(screen.getByRole("radio", { name: "오류를 발견했어요" }));
  await user.type(screen.getByLabelText(/문의 내용/), CONTENT);

  return user;
};

const submitButton = () => screen.getByRole("button", { name: "문의 접수하기" });

beforeEach(() => {
  vi.clearAllMocks();
  sendFeedback.mockResolvedValue(undefined);
  uploadFeedbackImages.mockImplementation((files: readonly File[]) =>
    Promise.resolve({ imageIds: files.map((_, index) => `id-${index}`) }),
  );

  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
});

describe("이미지 첨부", () => {
  it("첨부하면 미리보기에 나타난다", async () => {
    const user = await start();

    await attach(user, [png()]);

    expect(await screen.findByRole("button", { name: "첨부한 사진 1 크게 보기" })).toBeInTheDocument();
  });

  it("서버가 받는 형식만 고르도록 accept 를 둔다", async () => {
    await start();

    expect(document.querySelector('input[type="file"]')).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/heic,image/heif",
    );
  });

  it("다섯 장을 첨부하면 첨부 버튼을 비활성화한다", async () => {
    const user = await start();

    await attach(user, [png("1.png"), png("2.png"), png("3.png"), png("4.png"), png("5.png")]);

    await waitFor(() => expect(screen.getByRole("button", { name: "이미지 첨부" })).toBeDisabled());
  });

  it("다섯 장을 넘겨 고르면 다섯 장까지만 받는다", async () => {
    const user = await start();

    await attach(user, [png("1.png"), png("2.png"), png("3.png"), png("4.png"), png("5.png"), png("6.png")]);

    await waitFor(() => expect(screen.getByText("5 / 5 · 장당 5MB · JPG, PNG, HEIC")).toBeInTheDocument());
  });

  it("삭제하면 미리보기에서 사라지고 첨부 버튼이 다시 켜진다", async () => {
    const user = await start();
    await attach(user, [png("1.png"), png("2.png"), png("3.png"), png("4.png"), png("5.png")]);
    await waitFor(() => expect(screen.getByRole("button", { name: "이미지 첨부" })).toBeDisabled());

    await user.click(screen.getByRole("button", { name: "첨부한 사진 1 삭제" }));

    expect(screen.getByRole("button", { name: "이미지 첨부" })).toBeEnabled();
    expect(screen.getByText("4 / 5 · 장당 5MB · JPG, PNG, HEIC")).toBeInTheDocument();
  });

  it("5MB 를 넘으면 올리지 않고 그 자리에서 알린다", async () => {
    const user = await start();

    await attach(user, [png("big.png", 6 * 1024 * 1024)]);

    expect(await screen.findByRole("alert")).toHaveTextContent("5MB 를 넘어요");
    expect(uploadFeedbackImages).not.toHaveBeenCalled();
  });

  /* 아이폰이 저장하는 형식이다. 서버가 JPEG 로 다시 저장해 주므로 그대로 올린다. */
  it("HEIC 도 첨부할 수 있다", async () => {
    await start();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const heic = new File(["x"], "photo.heic", { type: "image/heic" });

    Object.defineProperty(input, "files", { value: [heic], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(uploadFeedbackImages).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /* 사진이 아닌 파일은 서버가 거절하므로 그 자리에서 막는다. */
  it("사진이 아닌 파일은 받지 않는다", async () => {
    await start();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = new File(["x"], "문서.pdf", { type: "application/pdf" });

    Object.defineProperty(input, "files", { value: [pdf], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByRole("alert")).toHaveTextContent("사진 파일이 아니에요");
    expect(uploadFeedbackImages).not.toHaveBeenCalled();
  });

  it("올려서 받은 imageIds 를 문의에 함께 담는다", async () => {
    const user = await start();
    await attach(user, [png()]);
    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(submitButton());

    await waitFor(() => expect(sendFeedback).toHaveBeenCalledWith(expect.objectContaining({ imageIds: ["id-0"] })));
  });
});

describe("업로드 상태", () => {
  it("올리는 동안 진행 중임을 알린다", async () => {
    const user = await start();
    uploadFeedbackImages.mockReturnValue(new Promise(() => {}));

    await attach(user, [png()]);

    expect(await screen.findByRole("status", { name: "사진 1 올리는 중" })).toBeInTheDocument();
  });

  it("올리는 동안에는 제출할 수 없다", async () => {
    const user = await start();
    uploadFeedbackImages.mockReturnValue(new Promise(() => {}));

    await attach(user, [png()]);

    await waitFor(() => expect(submitButton()).toBeDisabled());
  });

  it("여러 장 중 한 장이라도 올리는 중이면 제출할 수 없다", async () => {
    const user = await start();
    await attach(user, [png("1.png")]);
    await waitFor(() => expect(submitButton()).toBeEnabled());

    uploadFeedbackImages.mockReturnValue(new Promise(() => {}));
    await attach(user, [png("2.png")]);

    await waitFor(() => expect(submitButton()).toBeDisabled());
  });

  it("모두 imageIds 를 받으면 제출할 수 있다", async () => {
    const user = await start();

    await attach(user, [png("1.png"), png("2.png")]);

    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it("올리는 동안에는 그 이미지를 삭제할 수 없다", async () => {
    const user = await start();
    uploadFeedbackImages.mockReturnValue(new Promise(() => {}));

    await attach(user, [png()]);
    await screen.findByRole("status", { name: "사진 1 올리는 중" });

    expect(screen.queryByRole("button", { name: "첨부한 사진 1 삭제" })).not.toBeInTheDocument();
  });

  it("올리다 실패한 이미지는 삭제할 수 있다", async () => {
    const user = await start();
    uploadFeedbackImages.mockRejectedValue(new ApiError(500, "INTERNAL_SERVER_ERROR", "실패"));

    await attach(user, [png()]);

    expect(await screen.findByRole("button", { name: "첨부한 사진 1 삭제" })).toBeInTheDocument();
  });

  it("실패한 이미지가 남아 있으면 제출할 수 없다", async () => {
    const user = await start();
    uploadFeedbackImages.mockRejectedValue(new ApiError(500, "INTERNAL_SERVER_ERROR", "실패"));

    await attach(user, [png()]);
    await screen.findByRole("button", { name: "첨부한 사진 1 삭제" });

    expect(submitButton()).toBeDisabled();
  });

  it("실패한 이미지를 지우면 제출할 수 있다", async () => {
    const user = await start();
    uploadFeedbackImages.mockRejectedValue(new ApiError(500, "INTERNAL_SERVER_ERROR", "실패"));
    await attach(user, [png()]);

    await user.click(await screen.findByRole("button", { name: "첨부한 사진 1 삭제" }));

    expect(submitButton()).toBeEnabled();
  });

  it("413 으로 실패하면 용량 때문이라고 알린다", async () => {
    const user = await start();
    uploadFeedbackImages.mockRejectedValue(new ApiError(413, "PAYLOAD_TOO_LARGE", "실패"));

    await attach(user, [png()]);

    expect(await screen.findByRole("alert")).toHaveTextContent("용량이 커서");
  });

  it("429 로 실패하면 잠시 뒤 다시 시도해 달라고 알린다", async () => {
    const user = await start();
    uploadFeedbackImages.mockRejectedValue(new ApiError(429, "TOO_MANY_REQUESTS", "실패"));

    await attach(user, [png()]);

    expect(await screen.findByRole("alert")).toHaveTextContent("잠시 뒤");
  });
});

describe("유형 변경", () => {
  it("유형을 바꾸면 첨부한 이미지도 비운다", async () => {
    const user = await start();
    await attach(user, [png()]);
    await screen.findByRole("button", { name: "첨부한 사진 1 크게 보기" });

    await user.click(screen.getByRole("radio", { name: "그 밖의 문의가 있어요" }));

    expect(screen.queryByRole("button", { name: "첨부한 사진 1 크게 보기" })).not.toBeInTheDocument();
  });
});

describe("첨부 이미지 전체화면", () => {
  it("누르면 크게 볼 수 있다", async () => {
    const user = await start();
    await attach(user, [png()]);

    await user.click(await screen.findByRole("button", { name: "첨부한 사진 1 크게 보기" }));

    expect(screen.getByRole("dialog", { name: "첨부한 사진" })).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("전체화면에서 삭제하면 목록에서도 사라진다", async () => {
    const user = await start();
    await attach(user, [png()]);
    await user.click(await screen.findByRole("button", { name: "첨부한 사진 1 크게 보기" }));

    await user.click(screen.getByRole("button", { name: "이 사진 삭제" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "첨부한 사진 1 크게 보기" })).not.toBeInTheDocument();
  });

  it("닫으면 작성 화면으로 돌아온다", async () => {
    const user = await start();
    await attach(user, [png()]);
    await user.click(await screen.findByRole("button", { name: "첨부한 사진 1 크게 보기" }));

    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "첨부한 사진 1 크게 보기" })).toBeInTheDocument();
  });
});
