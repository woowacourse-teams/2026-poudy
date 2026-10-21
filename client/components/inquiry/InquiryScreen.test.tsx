/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryScreen } from "./InquiryScreen";

import { ApiError } from "@/lib/api/client";

const sendFeedback = vi.fn();
const requestProductRegistration = vi.fn();
const uploadFeedbackImages = vi.fn();
const track = vi.fn();

vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  sendFeedback: (...args: unknown[]) => sendFeedback(...args),
  requestProductRegistration: (...args: unknown[]) => requestProductRegistration(...args),
  uploadFeedbackImages: (...args: unknown[]) => uploadFeedbackImages(...args),
}));
vi.mock("@/lib/analytics/track", () => ({ track: (...args: unknown[]) => track(...args) }));

const back = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, replace }) }));

const CONTENT = "열 자가 넘는 문의 내용입니다";
const png = (name = "shot.png", size = 1000) => {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const setup = (originPath?: string) => {
  const user = userEvent.setup();
  render(<InquiryScreen originPath={originPath} />);
  return user;
};

const submitButton = () => screen.getByRole("button", { name: /문의 접수하기|제품 등록 요청하기/ });
const attach = async (user: ReturnType<typeof userEvent.setup>, files: File[]) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("파일 입력이 없다");
  await user.upload(input, files);
};

beforeEach(() => {
  vi.clearAllMocks();
  sendFeedback.mockResolvedValue(undefined);
  requestProductRegistration.mockResolvedValue(undefined);
  uploadFeedbackImages.mockImplementation((files: readonly File[]) =>
    Promise.resolve({ imageIds: files.map((_, index) => `id-${index}`) }),
  );
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
});

describe("유형을 고르기 전(S40)", () => {
  it("유형 안내만 보여 주고 제출 버튼을 막는다", () => {
    setup();

    expect(screen.getByText("문의 유형을 고르면 입력할 항목이 나타나요.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/문의 내용/)).not.toBeInTheDocument();
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("제품 정보 정정은 유형 목록에 없다", () => {
    setup();

    expect(screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent)).toEqual([
      "오류 신고",
      "개선 제안",
      "제품 등록 요청",
      "그 밖의 문의",
    ]);
  });
});

describe("문의 작성(S40a · S40g)", () => {
  it("유형을 고르면 내용 칸이 나타나고, 막힌 이유는 버튼 위에 적지 않는다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));

    expect(screen.getByLabelText(/문의 내용/)).toHaveAttribute(
      "placeholder",
      "예를 들어 어느 화면에서 무엇을 누르셨는지 적어 주시면 도움이 돼요.",
    );
    expect(screen.queryByText(/접수할 수 있어요/)).not.toBeInTheDocument();
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("10자보다 짧으면 내용 칸에 최소 길이를 알리고 보내지 않는다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), "짧아요");
    await user.click(submitButton());

    expect(screen.getByText("10자 이상 적어 주세요. 지금 3자예요.")).toBeInTheDocument();
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  // 앞뒤 공백은 보낼 때 지우므로 글자 수와 최소 길이에서 빼고, 중간 공백은 센다(#823).
  it("앞뒤 공백을 빼고 중간 공백을 포함해 열 자를 채우면 보낼 수 있다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    fireEvent.change(screen.getByLabelText(/문의 내용/), { target: { value: "  가 나 다 라 마바  " } });

    expect(screen.getByText("10 / 2,000")).toBeInTheDocument();
    expect(submitButton()).not.toHaveAttribute("aria-disabled", "true");
  });

  it("앞뒤 공백은 글자 수와 최소 길이에 넣지 않는다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    const field = screen.getByLabelText(/문의 내용/);
    await user.type(field, "x");
    fireEvent.change(field, { target: { value: "  가 나 다 라 마  " } });
    fireEvent.blur(field);

    expect(screen.getByText("9 / 2,000")).toBeInTheDocument();
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("10자 이상 적어 주세요. 지금 9자예요.")).toBeInTheDocument();
  });

  it("내용을 비우면 앞서 띄운 오류를 바로 지운다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    const field = screen.getByLabelText(/문의 내용/);
    await user.type(field, "짧아요");
    fireEvent.blur(field);
    expect(screen.getByText("10자 이상 적어 주세요. 지금 3자예요.")).toBeInTheDocument();

    fireEvent.change(field, { target: { value: "   " } });

    expect(screen.queryByText(/10자 이상 적어 주세요/)).not.toBeInTheDocument();
    expect(field).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("0 / 2,000")).toBeInTheDocument();
  });

  it("앞뒤 공백을 지우고 보낸다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    fireEvent.change(screen.getByLabelText(/문의 내용/), { target: { value: "  가 나 다 라 마바  " } });
    await user.click(submitButton());

    expect(sendFeedback).toHaveBeenCalledWith(expect.objectContaining({ content: "가 나 다 라 마바" }));
  });

  it("유형을 바꾸면 앞서 적은 내용을 비운다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(screen.getByRole("radio", { name: "개선 제안" }));

    expect(screen.getByLabelText(/문의 내용/)).toHaveValue("");
  });

  it("유형 · 내용 · 경로 · 사진을 담아 보내고 접수 완료 요약을 보여 준다", async () => {
    const user = setup("/products?include=1");
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await attach(user, [png()]);
    await waitFor(() => expect(screen.getByText("1 / 5장 · 장당 5MB 이하 · JPG, PNG, HEIC")).toBeInTheDocument());
    await user.click(submitButton());

    expect(sendFeedback).toHaveBeenCalledWith({
      type: "BUG_REPORT",
      content: CONTENT,
      originPath: "/products?include=1",
      imageIds: ["id-0"],
    });
    expect(await screen.findByRole("heading", { name: "문의를 접수했어요" })).toHaveFocus();
    expect(screen.getByText("첨부 사진").nextSibling).toHaveTextContent("1장");
    expect(track).toHaveBeenCalledWith("inquiry_submitted", {
      inquiry_type: "bug_report",
      image_count: 1,
      has_origin_path: true,
    });
  });

  it("확인을 누르면 문의를 연 화면으로 돌아간다", async () => {
    const user = setup("/products/3");
    await user.click(screen.getByRole("radio", { name: "그 밖의 문의" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());
    await user.click(await screen.findByRole("button", { name: "확인" }));

    expect(replace).toHaveBeenCalledWith("/products/3");
  });

  it("보내기에 실패하면 내용을 지우지 않고 버튼 위에 이유를 알린다", async () => {
    sendFeedback.mockRejectedValueOnce(new ApiError(429, "TOO_MANY_REQUESTS", ""));
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("요청이 잦아요. 잠시 후 다시 시도해 주세요.");
    expect(screen.getByLabelText(/문의 내용/)).toHaveValue(CONTENT);
    expect(track).not.toHaveBeenCalled();
  });

  it("서버가 내용을 거절하면 내용 칸에 오류를 붙인다", async () => {
    sendFeedback.mockRejectedValueOnce(new ApiError(400, "INVALID_INPUT", ""));
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());

    await waitFor(() => expect(screen.getByLabelText(/문의 내용/)).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText("입력한 내용을 다시 확인해 주세요.")).toBeInTheDocument();
  });

  it("보내는 동안 두 번 눌러도 한 번만 보낸다", async () => {
    sendFeedback.mockReturnValue(new Promise(() => {}));
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());
    await user.click(submitButton());

    expect(sendFeedback).toHaveBeenCalledTimes(1);
  });
});

describe("사진 첨부", () => {
  const start = async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "오류 신고" }));
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    return user;
  };

  it("올리는 동안 상태 줄이 바뀌고 보낼 수 없다", async () => {
    uploadFeedbackImages.mockReturnValue(new Promise(() => {}));
    const user = await start();
    await attach(user, [png()]);

    expect(screen.getByText("0 / 5장 · 1장 올리는 중 · 장당 5MB 이하")).toBeInTheDocument();
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("올리지 못하면 사진을 눌러 다시 올리고, 성공하면 보낼 수 있다", async () => {
    uploadFeedbackImages.mockRejectedValueOnce(new ApiError(500, "INTERNAL_SERVER_ERROR", ""));
    const user = await start();
    await attach(user, [png()]);

    expect(await screen.findByText("1장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.")).toBeInTheDocument();
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "첨부 사진 1 다시 올리기" }));

    await waitFor(() => expect(submitButton()).not.toHaveAttribute("aria-disabled"));
    expect(uploadFeedbackImages).toHaveBeenCalledTimes(2);
  });

  it("올리는 중에 취소하면 사진이 빠지고 늦게 온 응답은 무시한다", async () => {
    let finish: (value: { imageIds: string[] }) => void = () => {};
    uploadFeedbackImages.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = await start();
    await attach(user, [png()]);
    await user.click(screen.getByRole("button", { name: "첨부 사진 1 올리기 취소" }));
    finish({ imageIds: ["late"] });

    await waitFor(() => expect(screen.getByText("0 / 5장 · 장당 5MB 이하 · JPG, PNG, HEIC")).toBeInTheDocument());
    await user.click(submitButton());
    expect(sendFeedback).toHaveBeenCalledWith(expect.objectContaining({ imageIds: [] }));
  });

  it("5MB를 넘는 사진은 올리지 않고 그 자리에서 알린다", async () => {
    const user = await start();
    await attach(user, [png("big.png", 6 * 1024 * 1024)]);

    expect(screen.getByText("big.png가 6MB라 최대 5MB를 넘어요. 더 작은 사진을 첨부해 주세요.")).toBeInTheDocument();
    expect(uploadFeedbackImages).not.toHaveBeenCalled();
  });
});

describe("제품 등록 요청(S40b)", () => {
  it("제품명과 적은 브랜드를 보내고, 사진 칸은 두지 않는다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "제품 등록 요청" }));

    expect(screen.queryByRole("group", { name: "사진" })).not.toBeInTheDocument();
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");

    await user.type(screen.getByLabelText("제품명"), "1025 독도 토너");
    await user.type(screen.getByRole("textbox", { name: /브랜드/ }), "  토리든 ");
    await user.click(submitButton());

    expect(requestProductRegistration).toHaveBeenCalledWith({ productName: "1025 독도 토너", brandName: "토리든" });
    expect(await screen.findByText("제품 등록 요청")).toBeInTheDocument();
    expect(screen.queryByText("첨부 사진")).not.toBeInTheDocument();
  });

  it("브랜드를 비워도 요청할 수 있다", async () => {
    const user = setup();
    await user.click(screen.getByRole("radio", { name: "제품 등록 요청" }));
    await user.type(screen.getByLabelText("제품명"), "1025 독도 토너");
    await user.click(submitButton());

    expect(requestProductRegistration).toHaveBeenCalledWith({ productName: "1025 독도 토너", brandName: "" });
  });
});
