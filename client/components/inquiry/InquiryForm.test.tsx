/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "./InquiryForm";

import { ApiError } from "@/lib/api/client";

const sendFeedback = vi.fn();
const requestProductRegistration = vi.fn();
const uploadFeedbackImages = vi.fn();

vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  sendFeedback: (...args: unknown[]) => sendFeedback(...args),
  requestProductRegistration: (...args: unknown[]) => requestProductRegistration(...args),
  uploadFeedbackImages: (...args: unknown[]) => uploadFeedbackImages(...args),
}));

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

const CONTENT = "열 자가 넘는 문의 내용입니다";

const submitButton = () => screen.getByRole("button", { name: "문의 접수하기" });

beforeEach(() => {
  vi.clearAllMocks();
  sendFeedback.mockResolvedValue(undefined);
  requestProductRegistration.mockResolvedValue(undefined);
  uploadFeedbackImages.mockResolvedValue({ imageIds: ["uploaded-1"] });

  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
});

const chooseBug = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("radio", { name: "오류를 발견했어요" }));
};

describe("유형 선택", () => {
  it("유형을 고르기 전에는 입력 항목을 보여 주지 않는다", () => {
    render(<InquiryForm originPath="/" />);

    expect(screen.queryByLabelText(/문의 내용/)).not.toBeInTheDocument();
    expect(screen.getByText("문의 유형을 선택하면 이어서 작성할 수 있어요.")).toBeInTheDocument();
  });

  it("유형을 고르기 전에는 제출 버튼을 누를 수 없다", () => {
    render(<InquiryForm originPath="/" />);

    expect(submitButton()).toBeDisabled();
  });

  it("유형을 고르면 해당 입력 항목이 나타난다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);

    await chooseBug(user);

    expect(screen.getByLabelText(/문의 내용/)).toBeInTheDocument();
  });

  it("제품 등록 요청을 고르면 제품명과 브랜드 입력이 나타난다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);

    await user.click(screen.getByRole("radio", { name: "등록하고 싶은 제품이 있어요" }));

    expect(screen.getByLabelText(/제품명/)).toBeInTheDocument();
    expect(screen.getByLabelText("브랜드")).toBeInTheDocument();
    expect(screen.queryByLabelText(/문의 내용/)).not.toBeInTheDocument();
  });

  it("유형을 바꾸면 앞서 적은 내용을 비운다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);

    await user.click(screen.getByRole("radio", { name: "개선하고 싶은 점이 있어요" }));

    expect(screen.getByLabelText(/문의 내용/)).toHaveValue("");
  });

  it("유형을 바꾸면 제품명과 브랜드도 비운다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await user.click(screen.getByRole("radio", { name: "등록하고 싶은 제품이 있어요" }));
    await user.type(screen.getByLabelText(/제품명/), "1025 독도 토너");
    await user.type(screen.getByLabelText("브랜드"), "라운드랩");

    await user.click(screen.getByRole("radio", { name: "그 밖의 문의가 있어요" }));
    await user.click(screen.getByRole("radio", { name: "등록하고 싶은 제품이 있어요" }));

    expect(screen.getByLabelText(/제품명/)).toHaveValue("");
    expect(screen.getByLabelText("브랜드")).toHaveValue("");
  });

  it("같은 유형을 다시 눌러도 적던 내용을 지우지 않는다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);

    await chooseBug(user);

    expect(screen.getByLabelText(/문의 내용/)).toHaveValue(CONTENT);
  });

  it("유형 선택 화면에 제품 정보 정정은 나타나지 않는다", () => {
    render(<InquiryForm originPath="/" />);

    expect(screen.queryByRole("radio", { name: /정확하지 않/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });
});

describe("입력과 제출 버튼의 상태", () => {
  it("열 자에 미치지 못하면 제출 버튼을 누를 수 없다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), "짧아요");

    expect(submitButton()).toBeDisabled();
  });

  it("공백만 입력하면 제출 버튼을 누를 수 없다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), "           ");

    expect(submitButton()).toBeDisabled();
  });

  it("열 자를 채우면 제출 버튼을 누를 수 있다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);

    expect(submitButton()).toBeEnabled();
  });

  it("2,000 자를 넘겨 입력할 수 없다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    expect(screen.getByLabelText(/문의 내용/)).toHaveAttribute("maxlength", "2000");
  });

  it("입력한 길이를 글자 수 표시에 반영한다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), "다섯글자요");

    expect(screen.getByText("5 / 2,000")).toBeInTheDocument();
  });
});

describe("전송 동작", () => {
  it("originPath 를 담아 문의를 보낸다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/products/123" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());

    await waitFor(() =>
      expect(sendFeedback).toHaveBeenCalledWith({
        type: "BUG_REPORT",
        content: CONTENT,
        originPath: "/products/123",
        imageIds: [],
      }),
    );
  });

  it("전송이 끝나기 전에 두 번 눌러도 요청은 한 번만 나간다", async () => {
    const user = userEvent.setup();
    let release = () => {};
    sendFeedback.mockReturnValue(new Promise<void>((resolve) => (release = resolve)));

    render(<InquiryForm originPath="/" />);
    await chooseBug(user);
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);

    await user.click(submitButton());
    await user.click(submitButton());

    expect(sendFeedback).toHaveBeenCalledTimes(1);
    release();
  });

  it("전송에 성공하면 접수 완료 화면을 보여 준다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());

    expect(await screen.findByText("문의를 접수했어요")).toBeInTheDocument();
    expect(screen.getByText("보내주신 내용을 확인해 반영할게요.")).toBeInTheDocument();
  });

  it("접수 완료 화면은 답변이나 반영 시점을 약속하지 않는다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseBug(user);

    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());
    await screen.findByText("문의를 접수했어요");

    expect(screen.queryByText(/답변드릴게요|빠른 시일/)).not.toBeInTheDocument();
  });
});

describe("오류 처리", () => {
  const fail = (status: number, code: string) => new ApiError(status, code, "실패");

  it("429 로 실패하면 잠시 뒤 다시 시도해 달라고 알린다", async () => {
    const user = userEvent.setup();
    sendFeedback.mockRejectedValue(fail(429, "TOO_MANY_REQUESTS"));

    render(<InquiryForm originPath="/" />);
    await chooseBug(user);
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("요청이 잦아");
  });

  it("전송에 실패하면 입력한 내용을 지우지 않는다", async () => {
    const user = userEvent.setup();
    sendFeedback.mockRejectedValue(fail(500, "INTERNAL_SERVER_ERROR"));

    render(<InquiryForm originPath="/" />);
    await chooseBug(user);
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());

    await screen.findByRole("alert");
    expect(screen.getByLabelText(/문의 내용/)).toHaveValue(CONTENT);
  });

  it("실패한 뒤 다시 전송할 수 있다", async () => {
    const user = userEvent.setup();
    sendFeedback.mockRejectedValueOnce(fail(500, "INTERNAL_SERVER_ERROR")).mockResolvedValue(undefined);

    render(<InquiryForm originPath="/" />);
    await chooseBug(user);
    await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
    await user.click(submitButton());
    await screen.findByRole("alert");

    await user.click(submitButton());

    expect(await screen.findByText("문의를 접수했어요")).toBeInTheDocument();
  });
});

describe("제품 등록 요청", () => {
  const chooseProduct = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("radio", { name: "등록하고 싶은 제품이 있어요" }));
  };

  it("제품명이 비어 있으면 제출할 수 없다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseProduct(user);

    expect(screen.getByRole("button", { name: "제품 등록 요청하기" })).toBeDisabled();
  });

  it("브랜드가 비어 있어도 제출 버튼이 켜진다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseProduct(user);

    await user.type(screen.getByLabelText(/제품명/), "1025 독도 토너");

    expect(screen.getByRole("button", { name: "제품 등록 요청하기" })).toBeEnabled();
  });

  it("브랜드 없이 등록을 요청할 수 있다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseProduct(user);

    await user.type(screen.getByLabelText(/제품명/), "1025 독도 토너");
    await user.click(screen.getByRole("button", { name: "제품 등록 요청하기" }));

    await waitFor(() =>
      expect(requestProductRegistration).toHaveBeenCalledWith({ productName: "1025 독도 토너", brandName: "" }),
    );
  });

  it("브랜드를 적으면 함께 보낸다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseProduct(user);

    await user.type(screen.getByLabelText(/제품명/), "1025 독도 토너");
    await user.type(screen.getByLabelText("브랜드"), "라운드랩");
    await user.click(screen.getByRole("button", { name: "제품 등록 요청하기" }));

    await waitFor(() =>
      expect(requestProductRegistration).toHaveBeenCalledWith({
        productName: "1025 독도 토너",
        brandName: "라운드랩",
      }),
    );
  });

  it("제품 등록 요청에서는 이미지를 첨부할 수 없다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/" />);
    await chooseProduct(user);

    expect(screen.queryByRole("button", { name: "이미지 첨부" })).not.toBeInTheDocument();
  });
});

describe("유형이 정해진 채로 들어온 경우", () => {
  const fixed = {
    type: "DATA_CORRECTION" as const,
    fieldLabel: "제보 내용",
    placeholder: "무엇이 다른지 적어주세요.",
    header: <h2>제품 정보가 정확하지 않나요?</h2>,
  };

  it("유형 버튼을 그리지 않는다", () => {
    render(<InquiryForm originPath="/products/123" fixed={fixed} />);

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("라벨이 제보 내용으로 나타난다", () => {
    render(<InquiryForm originPath="/products/123" fixed={fixed} />);

    expect(screen.getByLabelText(/제보 내용/)).toBeInTheDocument();
  });

  it("DATA_CORRECTION 으로 경로를 담아 보낸다", async () => {
    const user = userEvent.setup();
    render(<InquiryForm originPath="/products/123" fixed={fixed} />);

    await user.type(screen.getByLabelText(/제보 내용/), CONTENT);
    await user.click(submitButton());

    await waitFor(() =>
      expect(sendFeedback).toHaveBeenCalledWith({
        type: "DATA_CORRECTION",
        content: CONTENT,
        originPath: "/products/123",
        imageIds: [],
      }),
    );
  });

  it("대상 제품을 사용자가 바꿀 수 없다", () => {
    render(<InquiryForm originPath="/products/123" fixed={{ ...fixed, header: <p>1025 독도 토너 200ml</p> }} />);

    const target = screen.getByText("1025 독도 토너 200ml");
    expect(within(target).queryByRole("button")).not.toBeInTheDocument();
    expect(within(target).queryByRole("textbox")).not.toBeInTheDocument();
  });
});
