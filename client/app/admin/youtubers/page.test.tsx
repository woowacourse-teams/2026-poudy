/** @vitest-environment jsdom */
import { YouTubeOrderRequest } from "@poudy/api/api.zod";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import AdminYouTubersPage from "./page";

import { server } from "@/mocks/server";

vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { readonly children: ReactNode }) => <main>{children}</main>,
}));

function setup(failSecond = false) {
  const channels = [
    { id: "a", name: "가 유튜버", displayOrder: 0 },
    { id: "b", name: "나 유튜버", displayOrder: 1 },
    { id: "c", name: "다 유튜버", displayOrder: 2 },
  ];
  const requests: string[] = [];
  server.use(
    http.get("*/api/admin/youtube/channels", () =>
      HttpResponse.json([...channels].sort((a, b) => a.displayOrder - b.displayOrder)),
    ),
    http.patch("*/api/admin/youtube/channels/:id/order", async ({ params, request }) => {
      const body = YouTubeOrderRequest.parse(await request.json());
      requests.push(String(params.id));
      if (failSecond && requests.length === 2) return new HttpResponse(null, { status: 503 });
      const channel = channels.find((c) => c.id === params.id);
      if (!channel) return new HttpResponse(null, { status: 404 });
      channel.displayOrder = body.displayOrder;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { channels, requests };
}

const order = () => screen.getAllByRole("listitem").map((row) => within(row).getByRole("link").textContent);

it("드래그한 순서는 저장 버튼을 누를 때 반영하고 서버 순서를 다시 읽는다", async () => {
  const { channels, requests } = setup();
  render(<AdminYouTubersPage />);
  const handle = await screen.findByRole("button", { name: "가 유튜버 순서 이동" });
  const transfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(handle, { dataTransfer: transfer });
  const destination = screen.getAllByRole("listitem")[2];
  fireEvent.dragOver(destination, { dataTransfer: transfer });
  fireEvent.drop(destination, { dataTransfer: transfer });
  fireEvent.dragEnd(handle);
  expect(order()).toEqual(["나 유튜버", "다 유튜버", "가 유튜버"]);
  expect(requests).toEqual([]);
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByText("순서를 저장했어요.");
  expect(requests).toEqual(["b", "c", "a"]);
  expect(channels.map((c) => c.displayOrder)).toEqual([2, 0, 1]);
  expect(order()).toEqual(["나 유튜버", "다 유튜버", "가 유튜버"]);
  expect(screen.getByRole("button", { name: "순서 저장" })).toBeDisabled();
});

it("키보드와 이동 버튼으로 정렬하고 첫 행과 마지막 행의 경계를 지킨다", async () => {
  setup();
  render(<AdminYouTubersPage />);
  const handle = await screen.findByRole("button", { name: "가 유튜버 순서 이동" });
  expect(screen.getByRole("button", { name: "가 유튜버 위로 이동" })).toBeDisabled();
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  expect(order()).toEqual(["가 유튜버", "나 유튜버", "다 유튜버"]);
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  expect(order()).toEqual(["나 유튜버", "가 유튜버", "다 유튜버"]);
  fireEvent.click(screen.getByRole("button", { name: "가 유튜버 아래로 이동" }));
  expect(order()).toEqual(["나 유튜버", "다 유튜버", "가 유튜버"]);
  expect(screen.getByRole("button", { name: "가 유튜버 아래로 이동" })).toBeDisabled();
});

it("중간 저장 실패 시 편집 순서를 유지하고 전체 순서를 재시도한다", async () => {
  const { channels, requests } = setup(true);
  render(<AdminYouTubersPage />);
  fireEvent.click(await screen.findByRole("button", { name: "다 유튜버 위로 이동" }));
  fireEvent.click(screen.getByRole("button", { name: "다 유튜버 위로 이동" }));
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByRole("alert");
  expect(order()).toEqual(["다 유튜버", "가 유튜버", "나 유튜버"]);
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByText("순서를 저장했어요.");
  expect(requests).toEqual(["c", "a", "c", "a", "b"]);
  expect(channels.map((c) => c.displayOrder)).toEqual([1, 2, 0]);
  expect(screen.getByRole("button", { name: "순서 저장" })).toBeDisabled();
});
