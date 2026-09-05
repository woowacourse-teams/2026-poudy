/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InquiryScreen } from "./InquiryScreen";

import { toOriginPath } from "@/lib/domain/origin-path";

const sendFeedback = vi.fn();
vi.mock("@/lib/api/feedback", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/feedback")>()),
  sendFeedback: (...args: unknown[]) => sendFeedback(...args),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), replace: vi.fn() }) }));

const CONTENT = "열 자가 넘는 문의 내용입니다";

/* 경로를 고르는 일은 서버 컴포넌트가 맡으므로 화면에는 정해진 값이 들어온다. */
const renderWith = (originPath: string) => render(<InquiryScreen originPath={originPath} />);

const submit = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("radio", { name: "그 밖의 문의가 있어요" }));
  await user.type(screen.getByLabelText(/문의 내용/), CONTENT);
  await user.click(screen.getByRole("button", { name: "문의 접수하기" }));
};

const sentPath = () => sendFeedback.mock.calls[0][0].originPath;

beforeEach(() => {
  vi.clearAllMocks();
  sendFeedback.mockResolvedValue(undefined);
});

describe("문의를 연 화면의 경로", () => {
  it("from 에 담긴 경로를 그대로 보낸다", async () => {
    const user = userEvent.setup();
    renderWith("/products/123");

    await submit(user);

    await waitFor(() => expect(sentPath()).toBe("/products/123"));
  });

  it("from 이 없으면 홈을 보낸다", async () => {
    const user = userEvent.setup();
    renderWith("/");

    await submit(user);

    await waitFor(() => expect(sentPath()).toBe("/"));
  });

  it("우리 화면의 경로가 아니면 홈을 보낸다", async () => {
    const user = userEvent.setup();
    renderWith(toOriginPath("https://example.com/spam"));

    await submit(user);

    await waitFor(() => expect(sentPath()).toBe("/"));
  });

  it("검색 조건이 함께 실려 가지 않는다", async () => {
    const user = userEvent.setup();
    renderWith(toOriginPath("/products?include=1&exclude=2"));

    await submit(user);

    await waitFor(() => expect(sentPath()).toBe("/products"));
  });
});

describe("화면 구성", () => {
  it("상단 바에 문의하기라는 제목을 둔다", () => {
    renderWith("/");

    expect(screen.getByRole("heading", { name: "문의하기" })).toBeInTheDocument();
  });
});
