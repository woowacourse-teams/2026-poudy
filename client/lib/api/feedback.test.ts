import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./client";
import { isAcceptedImageType, requestProductRegistration, sendFeedback, uploadFeedbackImages } from "./feedback";

const okEmpty = () => new Response(null, { status: 204 });

const failWith = (status: number, code: string) =>
  new Response(JSON.stringify({ title: code, status, detail: "실패", code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(okEmpty());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://poudy.site");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const bodyOf = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body as string);

describe("의견 보내기", () => {
  it("originPath 를 서버 필드 이름인 path 로 보낸다", async () => {
    await sendFeedback({ type: "BUG_REPORT", content: "열 자가 넘는 내용", originPath: "/products/1" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://poudy.site/api/feedback");
    expect(bodyOf(0)).toEqual({ type: "BUG_REPORT", content: "열 자가 넘는 내용", path: "/products/1" });
  });

  it("첨부한 이미지가 있으면 imageIds 를 함께 보낸다", async () => {
    await sendFeedback({
      type: "OTHER",
      content: "열 자가 넘는 내용",
      originPath: "/",
      imageIds: ["a", "b"],
    });

    expect(bodyOf(0).imageIds).toEqual(["a", "b"]);
  });

  it("첨부한 이미지가 없으면 imageIds 를 보내지 않는다", async () => {
    await sendFeedback({ type: "OTHER", content: "열 자가 넘는 내용", originPath: "/", imageIds: [] });

    expect(bodyOf(0)).not.toHaveProperty("imageIds");
  });

  it("429 응답을 코드가 담긴 오류로 알린다", async () => {
    fetchMock.mockResolvedValue(failWith(429, "TOO_MANY_REQUESTS"));

    await expect(sendFeedback({ type: "OTHER", content: "열 자가 넘는 내용", originPath: "/" })).rejects.toMatchObject({
      status: 429,
      code: "TOO_MANY_REQUESTS",
    });
  });
});

describe("이미지 업로드", () => {
  it("여러 장을 images 라는 이름으로 함께 담는다", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ imageIds: ["one", "two"] }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const files = [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.jpg", { type: "image/jpeg" })];
    const result = await uploadFeedbackImages(files);

    const sent = fetchMock.mock.calls[0][1].body as FormData;
    expect(sent.getAll("images")).toHaveLength(2);
    expect(result.imageIds).toEqual(["one", "two"]);
  });

  it("Content-Type 을 직접 정하지 않는다", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ imageIds: ["one"] }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await uploadFeedbackImages([new File(["a"], "a.png", { type: "image/png" })]);

    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
  });

  it("413 응답을 용량 초과 오류로 알린다", async () => {
    fetchMock.mockResolvedValue(failWith(413, "PAYLOAD_TOO_LARGE"));

    await expect(uploadFeedbackImages([new File(["a"], "a.png", { type: "image/png" })])).rejects.toMatchObject({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });
});

describe("제품 등록 요청", () => {
  it("제품명과 브랜드를 보낸다", async () => {
    await requestProductRegistration({ productName: "1025 독도 토너", brandName: "라운드랩" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://poudy.site/api/product-requests");
    expect(bodyOf(0)).toEqual({ productName: "1025 독도 토너", brandName: "라운드랩" });
  });

  it("브랜드가 비어 있으면 brandName 을 보내지 않는다", async () => {
    await requestProductRegistration({ productName: "1025 독도 토너", brandName: "   " });

    expect(bodyOf(0)).toEqual({ productName: "1025 독도 토너" });
  });

  it("경로를 담을 자리가 없으므로 path 를 보내지 않는다", async () => {
    await requestProductRegistration({ productName: "1025 독도 토너" });

    expect(bodyOf(0)).not.toHaveProperty("path");
  });
});

describe("이미지 형식 검사", () => {
  it("JPG 와 PNG 를 받는다", () => {
    expect(isAcceptedImageType("image/jpeg")).toBe(true);
    expect(isAcceptedImageType("image/png")).toBe(true);
  });

  it("서버가 아직 받지 못하는 HEIC 는 거른다", () => {
    expect(isAcceptedImageType("image/heic")).toBe(false);
  });
});

describe("오류 형태", () => {
  it("응답 본문이 JSON 이 아니어도 ApiError 로 바꾼다", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 500 }));

    await expect(sendFeedback({ type: "OTHER", content: "열 자가 넘는 내용", originPath: "/" })).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("요청이 아예 나가지 못하면 NETWORK_ERROR 로 알린다", async () => {
    fetchMock.mockRejectedValue(new Error("끊김"));

    await expect(sendFeedback({ type: "OTHER", content: "열 자가 넘는 내용", originPath: "/" })).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });
});
