import { beforeEach, expect, it, vi } from "vitest";

const { requestCookies, navigation } = vi.hoisted(() => ({
  requestCookies: { has: vi.fn() },
  navigation: { redirect: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => requestCookies }));
vi.mock("next/navigation", () => navigation);

import { requireMyFilterSession } from "./my-filter-session";

beforeEach(() => {
  requestCookies.has.mockReset();
  navigation.redirect.mockReset();
});

it("세션 쿠키 없이 켠 주소는 나머지 쿼리를 두고 플래그만 뺀 주소로 보낸다", async () => {
  requestCookies.has.mockReturnValue(false);
  await requireMyFilterSession("/products", new URLSearchParams("keyword=토너&myFilter=true&from=skin_type"));
  expect(navigation.redirect).toHaveBeenCalledWith(
    `/products?${new URLSearchParams("keyword=토너&from=skin_type").toString()}`,
  );
});

it("플래그만 있던 주소는 쿼리 없이 보낸다", async () => {
  requestCookies.has.mockReturnValue(false);
  await requireMyFilterSession("/brands/3", new URLSearchParams("myFilter=true"));
  expect(navigation.redirect).toHaveBeenCalledWith("/brands/3");
});

it("세션 쿠키가 있거나 꺼진 주소는 그대로 둔다", async () => {
  requestCookies.has.mockReturnValue(true);
  await requireMyFilterSession("/products", new URLSearchParams("myFilter=true"));
  requestCookies.has.mockReturnValue(false);
  await requireMyFilterSession("/products", new URLSearchParams("keyword=토너"));
  expect(navigation.redirect).not.toHaveBeenCalled();
});
