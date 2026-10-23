import { expect, it, vi } from "vitest";

import { fetchProducts, fetchProductCount } from "./products";

import { EMPTY_FILTER } from "@/lib/domain/filter";

it.each([fetchProducts, fetchProductCount])(
  "나만의 필터 요청은 실제 fetch에 쿠키와 no-store를 전달한다",
  async (fetchApi) => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      await fetchApi({ ...EMPTY_FILTER, myFilter: true }, "JSESSIONID=member");
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("myFilter=true"),
        expect.objectContaining({
          credentials: "include",
          cache: "no-store",
          headers: { Cookie: "JSESSIONID=member", "X-Poudy-SSR": "true" },
        }),
      );
      expect(spy.mock.calls[0][1]).not.toHaveProperty("next");
    } finally {
      spy.mockRestore();
    }
  },
);
