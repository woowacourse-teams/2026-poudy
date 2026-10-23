/**
 * @vitest-environment jsdom
 */
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyFilterScreen } from "./MyFilterScreen";

import { addMyFilterIngredients } from "@/lib/api/my-filter";
import { server } from "@/mocks/server";
import { resetMockShelf } from "@/mocks/shelf-handlers";

// 실제 라우터처럼 그릴 때마다 같은 객체를 돌려준다. 새 객체를 주면 화면이 그릴 때마다 필터를 다시 읽는다.
const { router, push, replace } = vi.hoisted(() => {
  const mocks = { push: vi.fn(), replace: vi.fn() };
  return { ...mocks, router: { back: vi.fn(), ...mocks } };
});
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/my-page/filter",
}));

const rowNames = (region: HTMLElement) =>
  within(region)
    .getAllByRole("listitem")
    .map((item) => within(item).getAllByText(/./)[0]?.textContent);

afterEach(() => {
  resetMockShelf();
  push.mockReset();
  replace.mockReset();
});

describe("나만의 필터", () => {
  it("필터에 든 성분을 최근에 넣은 순서로 제형 기능과 함께 보여 준다", async () => {
    await addMyFilterIngredients([9001, 9002, 9003]);
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    const list = await screen.findByRole("region", { name: "검색에서 제외 중" });
    expect(screen.getByRole("heading", { name: "검색에서 제외 중 · 3" })).toBeInTheDocument();
    expect(rowNames(list)).toEqual(["페녹시에탄올", "향료", "리모넨"]);
    expect(within(list).getByText("보존제")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /선반 보기/ })).toHaveAttribute("href", "/shelf");
  });

  it("성분 이름 뒤에 그 성분이 속한 주의 성분군을 알린다(S55j)", async () => {
    await addMyFilterIngredients([9001, 9003]);
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    const list = await screen.findByRole("region", { name: "검색에서 제외 중" });
    const [phenoxyethanol, limonene] = within(list).getAllByRole("listitem");
    expect(within(limonene!).getByRole("img", { name: "향료/알레르기 성분" })).toBeInTheDocument();
    expect(within(phenoxyethanol!).queryByRole("img")).not.toBeInTheDocument();
  });

  it("성분을 빼면 바로 사라지고, 되돌리면 같은 자리에 다시 넣는다", async () => {
    const user = userEvent.setup();
    const removed = vi.fn();
    const added = vi.fn();
    server.use(
      http.delete("*/api/users/me/my-filter/ingredients", ({ request }) => {
        removed(new URL(request.url).searchParams.getAll("ingredientIds"));
        return undefined;
      }),
      http.post("*/api/users/me/my-filter/ingredients", async ({ request }) => {
        added(await request.clone().json());
        return undefined;
      }),
    );
    await addMyFilterIngredients([9001, 9002, 9003]);
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    const list = await screen.findByRole("region", { name: "검색에서 제외 중" });
    await user.click(within(list).getByRole("button", { name: "향료 필터에서 빼기" }));

    await waitFor(() => expect(rowNames(list)).toEqual(["페녹시에탄올", "리모넨"]));
    expect(await screen.findByText("향료를 나만의 필터에서 뺐어요")).toBeInTheDocument();
    expect(removed).toHaveBeenCalledWith(["9002"]);
    // 선반 결과에 있는 성분이라 넣지 않은 성분 묶음으로 옮겨 가고, 알던 제형 기능을 함께 적는다(S55j-1).
    const candidates = screen.getByRole("region", { name: "선반에서 찾았지만 넣지 않은 성분" });
    expect(rowNames(candidates)).toEqual(["향료"]);
    expect(within(candidates).getByText("착향제")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "되돌리기" }));

    await waitFor(() => expect(rowNames(list)).toEqual(["페녹시에탄올", "향료", "리모넨"]));
    // 되돌리면 토스트가 닫힌다. 닫히는 전환이 끝나면 빠진다.
    await waitFor(() => expect(screen.queryByText("향료를 나만의 필터에서 뺐어요")).not.toBeInTheDocument());
    await waitFor(() => expect(added).toHaveBeenCalledWith({ ingredientIds: [9002] }));
  });

  it("빼지 못하면 성분을 제자리에 돌려놓고 알린다", async () => {
    const user = userEvent.setup();
    server.use(http.delete("*/api/users/me/my-filter/ingredients", () => HttpResponse.json({}, { status: 500 })));
    await addMyFilterIngredients([9001, 9002]);
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    const list = await screen.findByRole("region", { name: "검색에서 제외 중" });
    await user.click(within(list).getByRole("button", { name: "리모넨 필터에서 빼기" }));

    expect(await screen.findByText("필터에서 빼지 못했어요. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    await waitFor(() => expect(rowNames(list)).toEqual(["향료", "리모넨"]));
  });

  it("선반에서 찾았지만 넣지 않은 성분은 따로 모아 넣을 수 있다", async () => {
    const user = userEvent.setup();
    await addMyFilterIngredients([9001]);
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    const candidates = await screen.findByRole("region", { name: "선반에서 찾았지만 넣지 않은 성분" });
    expect(rowNames(candidates)).toEqual(["향료", "페녹시에탄올"]);

    await user.click(within(candidates).getByRole("button", { name: "향료 필터에 넣기" }));

    const list = screen.getByRole("region", { name: "검색에서 제외 중" });
    await waitFor(() => expect(rowNames(list)).toEqual(["향료", "리모넨"]));
    expect(rowNames(screen.getByRole("region", { name: "선반에서 찾았지만 넣지 않은 성분" }))).toEqual([
      "페녹시에탄올",
    ]);
    expect(await screen.findByText("향료를 나만의 필터에 넣었어요")).toBeInTheDocument();

    // 넣은 직후 되돌리면 다시 넣지 않은 성분 묶음으로 돌아간다(S55j-3).
    await user.click(screen.getByRole("button", { name: "되돌리기" }));

    await waitFor(() => expect(rowNames(list)).toEqual(["리모넨"]));
    expect(rowNames(screen.getByRole("region", { name: "선반에서 찾았지만 넣지 않은 성분" }))).toEqual([
      "향료",
      "페녹시에탄올",
    ]);
  });

  it("필터가 비고 찾은 성분도 없으면 선반으로 보낸다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/users/me/shelf/ingredient-analysis", () => HttpResponse.json({ badProductCount: 0, items: [] })),
    );
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    expect(await screen.findByText("선반에서 안 맞은 제품을 평가하면 성분을 찾아 드려요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "선반으로 가기" }));
    expect(push).toHaveBeenCalledWith("/shelf");
  });

  it("로그인 전이면 로그인 화면으로 보낸다", async () => {
    server.use(
      http.get("*/api/users/me/my-filter", () =>
        HttpResponse.json({ title: "UNAUTHORIZED", status: 401, code: "UNAUTHORIZED" }, { status: 401 }),
      ),
    );
    render(<MyFilterScreen />, { wrapper: ToastProvider });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
