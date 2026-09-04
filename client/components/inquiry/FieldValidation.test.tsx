/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryForm } from "./InquiryForm";

vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  sendFeedback: vi.fn().mockResolvedValue(undefined),
  requestProductRegistration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

beforeEach(() => {
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => {} }));
});

const startBug = async () => {
  const user = userEvent.setup();
  render(<InquiryForm originPath="/" />);
  await user.click(screen.getByRole("radio", { name: "오류를 발견했어요" }));

  return user;
};

const startProduct = async () => {
  const user = userEvent.setup();
  render(<InquiryForm originPath="/" />);
  await user.click(screen.getByRole("radio", { name: "등록하고 싶은 제품이 있어요" }));

  return user;
};

describe("문의 내용 검사", () => {
  it("입력이 멈춘 뒤에 잘못을 알린다", async () => {
    const user = await startBug();

    await user.type(screen.getByLabelText(/문의 내용/), "짧아요");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("10자 이상 적어주세요"));
  });

  it("치는 도중에는 아직 알리지 않는다", async () => {
    const user = await startBug();

    await user.type(screen.getByLabelText(/문의 내용/), "짧");

    /* 디바운스가 끝나기 전이라 아직 조용하다. */
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("아직 아무것도 적지 않으면 알리지 않는다", async () => {
    await startBug();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("열 자를 채우면 알림이 사라진다", async () => {
    const user = await startBug();
    const field = screen.getByLabelText(/문의 내용/);

    await user.type(field, "짧아요");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await user.type(field, " 이제는 열 자가 넘습니다");

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("입력 칸과 알림을 이어 둔다", async () => {
    const user = await startBug();

    await user.type(screen.getByLabelText(/문의 내용/), "짧아요");

    await waitFor(() => expect(screen.getByLabelText(/문의 내용/)).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText(/문의 내용/)).toHaveAttribute("aria-describedby", "inquiry-content-message");
  });
});

describe("설명 자리", () => {
  it("잘못이 없으면 설명을 보여 준다", async () => {
    await startProduct();

    expect(screen.getByText("용량이나 버전이 있다면 함께 적어주세요.")).toBeInTheDocument();
  });

  /*
   * maxLength 가 막고 있어 손으로는 넘길 수 없다. 붙여넣기처럼 그 밖의 경로로
   * 넘친 값이 들어왔을 때 설명 자리가 잘못으로 바뀌는지 본다.
   */
  it("잘못이 있으면 설명 대신 잘못을 보여 준다", async () => {
    await startProduct();
    const field = screen.getByLabelText(/제품명/) as HTMLInputElement;

    fireEvent.change(field, { target: { value: "가".repeat(201) } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("200자까지"));
    expect(screen.queryByText("용량이나 버전이 있다면 함께 적어주세요.")).not.toBeInTheDocument();
  });
});

describe("자리 확보", () => {
  it("잘못이 없어도 한 줄 자리를 비워 둔다", async () => {
    await startBug();

    /* 잘못이 생겨도 아래 내용이 밀리지 않도록 빈 자리를 미리 잡아 둔다. */
    expect(document.getElementById("inquiry-content-message")).toHaveClass("min-h-4");
  });

  it("브랜드처럼 설명이 없는 칸도 자리를 잡아 둔다", async () => {
    await startProduct();

    expect(document.getElementById("inquiry-brand-name-message")).toHaveClass("min-h-4");
  });
});
