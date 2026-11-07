/**
 * @vitest-environment jsdom
 */
import type { IngredientAnalysisResponse } from "@poudy/api/api.zod";
import { ToastProvider } from "@poudy/design-system/toast";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShelfFilterScreen } from "./ShelfFilterScreen";
import { ShelfScreen } from "./ShelfScreen";
import { ShelfRatingSheet } from "./ShelfSheets";

import { addGuestShelfProduct, leaveGuestShelfMode } from "@/lib/api/guest-shelf";
import { addMyFilterIngredients } from "@/lib/api/my-filter";
import { rememberShelfFeatureSheetSeen } from "@/lib/storage/shelf-feature-sheet";
import { allProducts } from "@/mocks/fixtures";
import { server } from "@/mocks/server";
import { resetMockShelf } from "@/mocks/shelf-handlers";

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push, replace }),
  usePathname: () => "/pouch",
}));

const SHELF_PATH = "*/api/users/me/shelf";

const singleBadAnalysis: IngredientAnalysisResponse = {
  badProductCount: 1,
  items: [
    {
      id: 9001,
      koreanName: "리모넨",
      formulationRoles: [],
      groupCodes: ["FRAGRANCE_ALLERGENS"],
      reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
      products: [{ id: 5, name: "평가한 제품", imageUrl: "" }],
      inFilter: false,
      isNew: true,
    },
  ],
};

// 제품이 담긴 파우치에 처음 들어오면 기능 설명 시트가 뜬다. 그 시트를 다루는 테스트 밖에서는 이미 본 것으로 둔다.
beforeEach(() => {
  rememberShelfFeatureSheetSeen();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  leaveGuestShelfMode();
  resetMockShelf();
  push.mockReset();
});

/** 회원 API 를 모두 401 로 돌려준다. 비로그인 성분 분석과 제품 제안은 회원 API 가 아니다. */
const signOut = () =>
  server.use(
    http.all("*/api/users/me/*", () =>
      HttpResponse.json({ code: "UNAUTHORIZED", status: 401, title: "UNAUTHORIZED" }, { status: 401 }),
    ),
  );

describe("파우치", () => {
  it("피부 타입이 있으면 나쁜 평가 한 개의 결과를 고르고 검색 제외에 저장한다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get("*/api/users/me", () =>
        HttpResponse.json({
          id: 1,
          provider: "KAKAO",
          email: "member@example.com",
          nickname: "포근한다람쥐1000",
          profileImageUrl: null,
          gender: null,
          ageRange: null,
          skinType: "DRY",
          sensitiveSkin: false,
        }),
      ),
      http.get(`${SHELF_PATH}/ingredient-analysis`, () => HttpResponse.json(singleBadAnalysis)),
      http.post("*/api/users/me/my-filter/ingredients", async ({ request }) => {
        sent(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const shelf = render(<ShelfScreen />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("button", { name: "검색에서 제외할 성분 고르기" }));
    expect(push).toHaveBeenCalledWith("/pouch/filter");
    expect(screen.queryByRole("link", { name: "피부 타입 입력하기" })).not.toBeInTheDocument();

    shelf.unmount();
    render(<ShelfFilterScreen />, { wrapper: ToastProvider });
    await user.click(await screen.findByRole("button", { name: "성분 1개 추가하기" }));

    await waitFor(() => expect(sent).toHaveBeenCalledWith({ ingredientIds: [9001] }));
    expect(await screen.findByText("성분 1개를 나만의 필터에 넣었어요")).toBeInTheDocument();
    expect(push).toHaveBeenLastCalledWith("/pouch");
  });

  it("피부 타입이 없으면 나쁜 평가 하나의 결과는 보이되 검색 제외 고르기는 권하지 않는다", async () => {
    server.use(http.get(`${SHELF_PATH}/ingredient-analysis`, () => HttpResponse.json(singleBadAnalysis)));
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(within(card).getByRole("link", { name: "리모넨 성분 설명 보기" })).toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  it("향수·클렌징 평가에서는 유수분 입력을 숨기고 선호도·사용 상태만 저장한다", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ShelfRatingSheet
        item={{
          product: { id: 99, name: "클렌징폼", brandName: "브랜드", marks: [], imageUrl: "", sensorySupported: false },
          rating: { preference: "GOOD", moistureLevel: 2, oilLevel: 1 },
          usageStatus: "IN_USE",
          possiblyUnsuitable: false,
          registeredAt: "2026-10-19T12:00:00+09:00",
        }}
        onClose={() => {}}
        onSave={onSave}
      />,
      { wrapper: ToastProvider },
    );
    expect(screen.queryByRole("slider", { name: "수분감" })).not.toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "유분감" })).not.toBeInTheDocument();
    expect(screen.queryByText(/유수분 레벨을 다듬는/)).not.toBeInTheDocument();
    // 평가 고치기는 사용 상태를 묻지 않고, 사용감이 없는 제품은 1단계만 두어 바로 저장한다(S52e-2).
    expect(screen.queryByRole("radiogroup", { name: "지금 쓰고 있나요?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "평가 저장" }));
    expect(onSave).toHaveBeenCalledWith(
      {
        usageStatus: "IN_USE",
        preference: "GOOD",
        moistureLevel: null,
        oilLevel: null,
      },
      expect.any(String),
    );
  });

  it("안 맞을 수 있는 성분과 사용 상태별 제품을 보여 준다", async () => {
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(
      within(card)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["리모넨", "향료", "페녹시에탄올"]);
    expect(within(card).getByRole("heading", { name: "아직 제외하지 않은 성분 3" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "검색에서 제외할 성분 고르기" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "피부 타입 입력하기" })).toHaveAttribute(
      "href",
      "/my-page/skin-type",
    );
    expect(within(card).getByRole("link", { name: "나만의 필터 관리" })).toHaveAttribute("href", "/my-page/filter");
    expect(screen.getByRole("heading", { name: "사용 중 · 3" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "사용 완료 · 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /평가하기$/ })).toHaveLength(1);
  });

  it("검색에서 제외 중인 성분은 따로 묶고, 결과에서 빠진 성분 수를 알린다(S53l)", async () => {
    // 리모넨은 결과에 든 채 제외 중이고, 알코올은 제외 중이지만 결과에서 빠졌다.
    await addMyFilterIngredients([9001]);
    server.use(
      http.get("*/api/users/me/my-filter", () =>
        HttpResponse.json({
          items: [
            { id: 9001, koreanName: "리모넨", formulationRoles: [], skinEffects: [], excludeCodes: [] },
            { id: 9100, koreanName: "알코올", formulationRoles: [], skinEffects: [], excludeCodes: [] },
          ],
        }),
      ),
    );
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(await within(card).findByRole("heading", { name: "검색에서 제외 중 2" })).toBeInTheDocument();
    expect(within(card).getByText("1개는 더 이상 의심되지 않아요")).toBeInTheDocument();
  });

  it("안 맞은 제품에서 주의 성분을 찾지 못하면 칩과 버튼 없이 찾지 못했다고 알린다", async () => {
    server.use(
      http.get(`${SHELF_PATH}/ingredient-analysis`, () => HttpResponse.json({ badProductCount: 1, items: [] })),
    );
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(within(card).getByText("안 맞았던 제품에서 주의 성분을 찾지 못했어요.")).toBeInTheDocument();
    expect(within(card).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    // 관리 링크만 남는다(S53m).
    expect(
      within(card)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/my-page/filter"]);
  });

  it("성분 칩을 누르면 그 성분의 설명으로 간다", async () => {
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    expect(within(card).getByRole("link", { name: "리모넨 성분 설명 보기" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/ingredients\/\d+$/),
    );
  });

  it("이름이 긴 성분 칩은 보이는 글자만 말줄임으로 자르고, 접근성 이름에는 전체 이름을 둔다", async () => {
    const longName = "테트라데실아미노부티로일발릴아미노부티릭우레아트라이플루오로아세테이트";
    server.use(
      http.get(`${SHELF_PATH}/ingredient-analysis`, () =>
        HttpResponse.json({
          badProductCount: 1,
          items: [
            {
              id: 7171,
              koreanName: longName,
              englishName: "Tetradecyl Aminobutyroylvalylaminobutyric Urea Trifluoroacetate",
              formulationRoles: [],
              groupCodes: [],
              reasons: [{ code: "QUICK_EXCLUDE", name: "빠른 제외 성분" }],
              products: [],
              inFilter: false,
              isNew: false,
            },
          ],
        }),
      ),
    );
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const card = await screen.findByRole("region", { name: "안 맞을 수 있는 성분" });
    const chip = await within(card).findByRole("link", { name: `${longName} 성분 설명 보기` });
    expect(chip).toHaveAttribute("href", "/ingredients/7171");
    expect(chip).toHaveClass("max-w-full");
    expect(chip.closest("li")).toHaveClass("max-w-full");
    expect(within(chip).getByText(longName)).toHaveClass("truncate");
  });

  it("제품 행의 이름을 누르면 제품 상세로 간다", async () => {
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const row = await screen.findByRole("link", { name: /1025 독도 토너/ });
    expect(row).toHaveAttribute("href", expect.stringMatching(/^\/products\/\d+$/));
  });

  it("평가 시트는 맞음 → 사용감 두 단계이고, 수분감·유분감은 고르기 전으로 시작해 고른 값만 보낸다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.put(`${SHELF_PATH}/products/:productId`, async ({ request }) => {
        // 값만 적어 두고 응답은 목 처리기에 넘긴다(undefined 를 돌려주면 다음 처리기가 받는다).
        sent(await request.clone().json());
        return undefined;
      }),
    );
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const [rate] = await screen.findAllByRole("button", { name: /평가하기$/ });
    await user.click(rate);
    expect(await screen.findByRole("progressbar", { name: "평가 1/2단계" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(await screen.findByRole("heading", { name: "사용감은 어땠나요?" })).toBeInTheDocument();
    const moisture = await screen.findByRole("slider", { name: "수분감" });
    const oil = screen.getByRole("slider", { name: "유분감" });
    expect(moisture).toHaveAttribute("aria-valuetext", "선택 전");
    expect(moisture).not.toHaveAttribute("aria-valuenow");
    expect(oil).toHaveAttribute("aria-valuetext", "선택 전");

    moisture.focus();
    await user.keyboard("{End}");
    expect(moisture).toHaveAttribute("aria-valuenow", "3");
    expect(moisture).toHaveAttribute("aria-valuetext", "높음");
    expect(oil).toHaveAttribute("aria-valuetext", "선택 전");

    await user.click(screen.getByRole("button", { name: "평가 저장" }));
    await waitFor(() => expect(sent).toHaveBeenCalled());
    expect(sent).toHaveBeenCalledWith(expect.objectContaining({ moistureLevel: 3, oilLevel: null }));
  });

  it("보기 칩을 고르면 그 사용 상태의 제품만 머리 없이 보여 준다", async () => {
    const user = userEvent.setup();
    render(<ShelfScreen />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("button", { name: "사용 완료 2" }));

    expect(screen.getByRole("button", { name: "사용 완료 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: /사용 중 ·/ })).not.toBeInTheDocument();
  });

  it("제품 메뉴에서 파우치에서 빼면 확인한 뒤 목록에서 사라진다", async () => {
    const user = userEvent.setup();
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const [firstMenu] = await screen.findAllByRole("button", { name: /메뉴$/ });
    const name = firstMenu.getAttribute("aria-label")?.replace(/ 메뉴$/, "") ?? "";
    await user.click(firstMenu);
    await user.click(screen.getByRole("button", { name: "파우치에서 빼기" }));
    expect(screen.getByRole("heading", { name: /파우치에서 뺄까요\?/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "빼기" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: `${name} 메뉴` })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "전체 4" })).toBeInTheDocument();
  });

  it("제품 메뉴에서 옮기면 되돌리기 토스트를 띄우고, 되돌리면 앞의 사용 상태로 돌린다", async () => {
    const user = userEvent.setup();
    render(<ShelfScreen />, { wrapper: ToastProvider });

    const [firstMenu] = await screen.findAllByRole("button", { name: /메뉴$/ });
    const name = firstMenu.getAttribute("aria-label")?.replace(/ 메뉴$/, "") ?? "";
    await user.click(firstMenu);
    await user.click(screen.getByRole("button", { name: "사용 완료로 옮기기" }));

    expect(await screen.findByText(new RegExp(`^${name}[을를] ‘사용 완료’\u2060?로 옮겼어요$`))).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "사용 중 2" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "사용 중 3" })).toBeInTheDocument());
  });

  it("파우치를 불러오지 못하면 화면 오류와 다시 시도를 보여 준다", async () => {
    server.use(http.get(`${SHELF_PATH}/products`, () => HttpResponse.json({}, { status: 500 })));
    render(<ShelfScreen />, { wrapper: ToastProvider });

    expect(await screen.findByRole("heading", { name: "파우치를 불러오지 못했어요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("로그인하지 않았고 비로그인 파우치가 비었으면 파우치 소개와 담기 버튼을 보여 준다", async () => {
    const user = userEvent.setup();
    signOut();
    render(<ShelfScreen />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("button", { name: "파우치에 제품 담기" }));
    expect(push).toHaveBeenCalledWith("/pouch/add");
    await user.click(screen.getByRole("button", { name: "파우치 기능 자세히 보기" }));
    expect(push).toHaveBeenCalledWith("/pouch/guide");
    expect(screen.getByRole("button", { name: "제품 추가" })).toBeInTheDocument();
  });

  it("로그인하지 않았으면 이 탭에 담은 파우치와 서버가 계산한 성분을 보여 주고, 나만의 필터는 두지 않는다", async () => {
    signOut();
    const product = allProducts[0]!;
    addGuestShelfProduct(
      {
        id: product.id,
        name: product.name,
        brandName: product.brand.name,
        marks: product.marks,
        imageUrl: product.imageUrl,
        sensorySupported: false,
      },
      { usageStatus: "IN_USE", preference: "BAD", moistureLevel: null, oilLevel: null },
    );
    render(<ShelfScreen />, { wrapper: ToastProvider });

    expect(await screen.findByRole("note")).toHaveTextContent("로그인하지 않고 나가면 담은 1개가 사라져요.");
    expect(screen.getByRole("region", { name: "파우치 제품" })).toHaveTextContent(product.name);
    expect(screen.getByRole("heading", { name: "안 맞을 수 있는 성분" })).toBeInTheDocument();
    expect(screen.getByText(/^찾은 성분/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "나만의 필터 관리" })).not.toBeInTheDocument();
  });

  it("제품이 담긴 채 처음 들어오면 기능 설명 시트를 한 번만 띄운다", async () => {
    window.localStorage.clear();
    const first = render(<ShelfScreen />, { wrapper: ToastProvider });

    expect(await screen.findByRole("dialog", { name: /나에게 맞는 화장품이 보여요/ })).toBeInTheDocument();
    first.unmount();

    render(<ShelfScreen />, { wrapper: ToastProvider });
    await screen.findByRole("region", { name: "파우치 제품" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("파우치가 비었으면 파우치 소개와 제품 추가 버튼을 보여 준다", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${SHELF_PATH}/products`, () =>
        HttpResponse.json({
          usages: [
            { code: "ALL", name: "전체", count: 0 },
            { code: "IN_USE", name: "사용 중", count: 0 },
            { code: "USED", name: "사용 완료", count: 0 },
          ],
          items: [],
        }),
      ),
    );
    render(<ShelfScreen />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("button", { name: "제품 추가하기" }));
    expect(push).toHaveBeenCalledWith("/pouch/add");
    await user.click(screen.getByRole("button", { name: "파우치는 어떻게 쓰나요?" }));
    expect(push).toHaveBeenCalledWith("/pouch/guide");
    // 빈 파우치는 본문이 안내를 맡으므로 기능 설명 시트를 띄우지 않는다(UX-04).
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("검색에서 제외할 성분 고르기", () => {
  it("선정 근거가 여러 개여도 성분별 행과 전송 ID는 하나만 둔다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.get(`${SHELF_PATH}/ingredient-analysis`, () =>
        HttpResponse.json({
          ...singleBadAnalysis,
          items: [
            {
              ...singleBadAnalysis.items[0],
              reasons: [
                { code: "QUICK_EXCLUDE", name: "빠른 제외 성분" },
                { code: "DRY_SKIN", name: "건성 피부 주의 후보" },
                { code: "SENSITIVE_SKIN", name: "민감성 피부 주의 후보" },
              ],
            },
          ],
        }),
      ),
      http.post("*/api/users/me/my-filter/ingredients", async ({ request }) => {
        sent(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<ShelfFilterScreen />, { wrapper: ToastProvider });

    expect(await screen.findByRole("checkbox", { name: /리모넨/ })).toBeChecked();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByText("빠른 제외 성분 · 건성 피부 주의 후보 · 민감성 피부 주의 후보")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "성분 1개 추가하기" }));
    await waitFor(() => expect(sent).toHaveBeenCalledWith({ ingredientIds: [9001] }));
  });

  it("처음에는 결과 성분을 모두 골라 두고, 고른 성분만 나만의 필터에 넣는다", async () => {
    const user = userEvent.setup();
    const sent = vi.fn();
    server.use(
      http.post("*/api/users/me/my-filter/ingredients", async ({ request }) => {
        sent(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<ShelfFilterScreen />, { wrapper: ToastProvider });

    await user.click(await screen.findByRole("checkbox", { name: /향료/ }));
    await user.click(screen.getByRole("button", { name: "성분 2개 추가하기" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/pouch"));
    expect(sent).toHaveBeenCalledWith({ ingredientIds: [9001, 9003] });
    expect(await screen.findByText("성분 2개를 나만의 필터에 넣었어요")).toBeInTheDocument();
  });
});
