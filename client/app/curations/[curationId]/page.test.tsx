/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchCuration: vi.fn(), fetchCurations: vi.fn() }));

vi.mock("@/lib/api/products", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/products")>()),
  ...api,
}));
/* 바는 방문 기록과 라우터를 읽는다. 여기서는 어떤 제목을 받았는지만 보므로 제목만 그린다. */
vi.mock("@/components/ui/HidingTopBar", () => ({
  HidingTopBar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/ui/ShareButton", () => ({ ShareButton: () => null }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import CurationDetailPage from "./page";

import { track } from "@/lib/analytics/track";
import { ApiError } from "@/lib/api/client";

const curation = {
  id: 5,
  title: "가을바람에 지친 피부, 장벽부터 채워요",
  description: "세라마이드·판테놀 보습 성분 모아보기",
  blocks: [],
};

const renderPage = async (curationId: string) =>
  render(await CurationDetailPage({ params: Promise.resolve({ curationId }), searchParams: Promise.resolve({}) }));

beforeEach(() => {
  api.fetchCurations.mockResolvedValue({
    items: [
      { id: 5, title: "지금 기획전", description: "", thumbnailImageUrl: "/a.jpg" },
      { id: 6, title: "다음 기획전", description: "", thumbnailImageUrl: "/b.jpg" },
    ],
  });
});

describe("큐레이션 상세", () => {
  /* 첫 화면이 기획전 이미지로 열리도록 제목은 바에만 두고 본문에 따로 세우지 않는다. */
  it("기획전 이름을 바의 제목으로 쓴다", async () => {
    api.fetchCuration.mockResolvedValue(curation);

    await renderPage("5");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(curation.title);
    expect(screen.queryByText(curation.description)).not.toBeInTheDocument();
  });

  /* 캐러셀을 거치지 않고 공유 링크나 검색으로 들어온 경우까지 어느 기획전을 봤는지 센다. */
  it("화면이 그려지면 어느 기획전을 봤는지 남긴다", async () => {
    api.fetchCuration.mockResolvedValue(curation);

    await renderPage("5");

    expect(track).toHaveBeenCalledWith("curation_viewed", { curation_id: 5 });
  });

  /* 본문을 다 읽은 뒤 이어 볼 다른 기획전과, 화면 맨 아래의 약관 링크를 둔다. */
  it("본문 아래에 다른 큐레이션과 footer 를 둔다", async () => {
    api.fetchCuration.mockResolvedValue(curation);

    await renderPage("5");

    expect(screen.getByRole("heading", { name: "다른 이야기도 준비했어요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /다음 기획전/ })).toHaveAttribute("href", "/curations/6");
    expect(screen.queryByRole("link", { name: /지금 기획전/ })).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("이용약관");
  });

  /* 목록을 받지 못해도 본문은 그대로 보여 준다. 이어 볼 목록만 빠진다. */
  it("다른 큐레이션 목록을 받지 못해도 본문을 그린다", async () => {
    api.fetchCuration.mockResolvedValue(curation);
    api.fetchCurations.mockRejectedValue(new Error("down"));

    await renderPage("5");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(curation.title);
    expect(screen.queryByRole("heading", { name: "다른 이야기도 준비했어요" })).not.toBeInTheDocument();
  });

  /*
   * 없는 기획전이거나 게시 중이 아니면 서버가 404 를 준다. 둘 다 이 화면에는 없는 것이라
   * 빈 화면을 그리지 않고 not-found 로 보낸다.
   */
  it("없는 기획전이면 not-found 로 보낸다", async () => {
    api.fetchCuration.mockRejectedValue(new ApiError(404, "CURATION_NOT_FOUND", "큐레이션을 찾을 수 없습니다."));

    await expect(renderPage("9999")).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  /* 주소에 숫자가 아닌 것이 오면 서버에 묻지 않고 곧바로 없는 화면으로 본다. */
  it("숫자가 아닌 주소는 조회하지 않고 not-found 로 보낸다", async () => {
    api.fetchCuration.mockClear();

    await expect(renderPage("어쩌고")).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(api.fetchCuration).not.toHaveBeenCalled();
  });

  /*
   * 조회가 통째로 무너진 것과 없는 기획전은 다르다. 서버 장애까지 404 로 덮으면 검색
   * 엔진이 멀쩡한 기획전을 없는 것으로 알고 색인에서 지운다.
   */
  it("조회가 실패하면 404 로 덮지 않고 그대로 올린다", async () => {
    api.fetchCuration.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "서버가 응답하지 않습니다."));

    await expect(renderPage("5")).rejects.toThrow("서버가 응답하지 않습니다.");
  });
});
