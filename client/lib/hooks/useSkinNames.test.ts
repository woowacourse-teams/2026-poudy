/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";

import { useSkinNames } from "./useSkinNames";

import { server } from "@/mocks/server";

it("고른 피부 선택지가 있으면 /api/skin-options 의 이름을 쓴다", async () => {
  server.use(
    http.get("*/api/skin-options", () =>
      HttpResponse.json({
        items: [
          { code: "DRY", name: "건조한 피부" },
          { code: "SENSITIVE", name: "예민한 피부" },
        ],
      }),
    ),
  );

  const { result } = renderHook(() => useSkinNames(["SENSITIVE"]));

  await waitFor(() => expect(result.current.get("SENSITIVE")).toBe("예민한 피부"));
  expect(result.current.get("DRY")).toBe("건조한 피부");
});

it("고른 피부 선택지가 없으면 묻지 않는다", async () => {
  let requested = false;
  server.use(
    http.get("*/api/skin-options", () => {
      requested = true;
      return HttpResponse.json({ items: [] });
    }),
  );

  const { result } = renderHook(() => useSkinNames([]));

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(requested).toBe(false);
  expect(result.current.size).toBe(0);
});
