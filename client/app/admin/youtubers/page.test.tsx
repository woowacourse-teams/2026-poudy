/** @vitest-environment jsdom */
import { YouTubeOrderRequest } from "@poudy/api/api.zod";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import AdminYouTubersPage from "./page";

import { server } from "@/mocks/server";

vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { readonly children: ReactNode }) => <main>{children}</main>,
}));

it("Order를 저장하고 서버에서 다시 읽은 순서를 표시한다", async () => {
  let position = 0;
  let submitted = false;
  server.use(
    http.get("*/api/admin/youtube/channels", () =>
      HttpResponse.json(
        [
          { id: "a", name: "가 유튜버", displayOrder: position },
          { id: "b", name: "나 유튜버", displayOrder: 1 },
        ].sort((a, b) => a.displayOrder - b.displayOrder),
      ),
    ),
    http.patch("*/api/admin/youtube/channels/a/order", async ({ request }) => {
      const body = YouTubeOrderRequest.parse(await request.json());
      position = body.displayOrder;
      submitted = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  render(<AdminYouTubersPage />);
  const input = await screen.findByRole("spinbutton", { name: "가 유튜버 Order" });
  fireEvent.change(input, { target: { value: "5" } });
  fireEvent.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("나 유튜버"));
  expect(submitted).toBe(true);
  expect(screen.getByRole("spinbutton", { name: "가 유튜버 Order" })).toHaveValue(5);
});
