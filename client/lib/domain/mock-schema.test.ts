import {
  BrandDetailResponse,
  BrandOverviewResponse,
  CategoryListResponse,
  CurationDetailResponse,
  BannerListResponse,
  FeedbackImageUploadResponse,
  IngredientDetailResponse,
  IngredientGroupListResponse,
  IngredientAnalysisResponse,
  IngredientGroupResponse,
  IngredientListResponse,
  IngredientPageResponse,
  UserResponse,
  UserProductResponse,
  ProblemDetail,
  ProductCountResponse,
  ProductDetailResponse,
  ProductSimilarityResponse,
  ProductPageResponse,
  ProductRankingResponse,
  RegisteredAccountResponse,
  RankingsResponse,
  RelatedKeywordsResponse,
  ShelfProductResponse,
  ShelfProductSuggestionPageResponse,
  ShelfResponse,
  SkinFilterResponse,
  SkinTypesResponse,
  WishlistResponse,
  WithdrawnAccountResponse,
} from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fetchExcludeCodes } from "@/lib/api/products";
import { excludeCodes } from "@/mocks/fixtures";
import { handlers } from "@/mocks/handlers";
import { resetMockShelf } from "@/mocks/shelf-handlers";

/*
 * 목 응답이 common/ 의 스키마와 어긋나지 않는지 지킨다.
 *
 * fixtures 는 타입 주석 없이 추론으로만 쓰는 자리가 있어, 서버가 필드를 늘리거나
 * 줄여도 typecheck 가 통과한다. 그러면 목으로 띄운 화면만 실제 응답과 달라진다.
 *
 * fixtures 배열이 아니라 handlers 가 내보내는 응답을 검사한다. 그래야 핸들러가
 * 응답을 조립하면서 필드를 빠뜨리는 것까지 함께 잡힌다.
 */

/**
 * 스키마에 없는 필드까지 잡아내려고 중첩까지 strict 로 바꾼다.
 * z.object 는 기본이 strip 이라, 그대로 쓰면 목에만 있는 필드가 조용히 통과한다.
 */
const deepStrict = (schema: z.ZodType): z.ZodType => {
  const def = (schema as unknown as { _zod: { def: Record<string, unknown> } })._zod.def;

  if (def.type === "object") {
    const shape = (schema as unknown as z.ZodObject).shape;

    return z.strictObject(Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, deepStrict(value)])));
  }
  if (def.type === "array") return z.array(deepStrict(def.element as z.ZodType));
  if (def.type === "optional") return z.optional(deepStrict(def.innerType as z.ZodType));
  if (def.type === "nullable") return z.nullable(deepStrict(def.innerType as z.ZodType));

  return schema;
};

const BASE = "http://localhost/api";

// 목 서버는 vitest.setup.ts 가 이미 띄워 둔다.
const get = async (path: string) => {
  const response = await fetch(`${BASE}${path}`);

  return { status: response.status, body: (await response.json()) as unknown };
};

/* 보내는 요청은 본문이 필요하다. 응답에 내용이 없는 곳은 상태 코드만 본다. */
const post = async (path: string, body: BodyInit, headers?: HeadersInit) => {
  const response = await fetch(`${BASE}${path}`, { method: "POST", body, headers });
  const text = await response.text();

  return { status: response.status, body: text ? (JSON.parse(text) as unknown) : undefined };
};

const patch = async (path: string, body: unknown) => {
  const response = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

  return { status: response.status, body: (await response.json()) as unknown };
};

const json = (body: unknown) => [JSON.stringify(body), { "Content-Type": "application/json" }] as const;

const cases = [
  ["제품 목록", "/products", ProductPageResponse],
  ["제품 수", "/products/count", ProductCountResponse],
  ["연관검색어", "/products/related-keywords?keyword=블랙", RelatedKeywordsResponse],
  ["제품 상세", "/products/1", ProductDetailResponse],
  // 손으로 적은 상세가 없는 제품은 목록 정보로 상세를 세운다. 그 자리도 스키마를 지켜야 한다.
  ["제품 상세(목록 정보로 세운 것)", "/products/9", ProductDetailResponse],
  ["회원별 제품 정보", "/users/me/products/1", UserProductResponse],
  ["저장함", "/users/me/wishlist/products", WishlistResponse],
  ["성분이 비슷한 제품", "/products/1/similarities", ProductSimilarityResponse],
  ["성분 목록", "/ingredients", IngredientPageResponse],
  ["성분 목록(ID 조회)", "/ingredients?ingredientIds=1,2", IngredientPageResponse],
  ["성분 검색 제안", "/ingredients/suggestions?keyword=글리", IngredientListResponse],
  ["성분 상세", "/ingredients/1", IngredientDetailResponse],
  ["성분군 목록", "/ingredient-groups", IngredientGroupListResponse],
  ["빠른 제외 성분군", "/ingredient-groups?type=QUICK_EXCLUDE", IngredientGroupListResponse],
  ["성분 검색 제안(성분군 포함)", "/ingredients/suggestions?keyword=세라", IngredientListResponse],
  ["성분군 상세", "/ingredient-groups/CERAMIDES", IngredientGroupResponse],
  ["카테고리", "/categories", CategoryListResponse],
  ["브랜드 목록", "/brands", BrandOverviewResponse],
  ["브랜드 상세", "/brands/1", BrandDetailResponse],
  ["MAIN 배너", "/banners?slot=MAIN", BannerListResponse],
  ["STRIP 배너", "/banners?slot=STRIP", BannerListResponse],
  ["큐레이션 상세", "/curations/1", CurationDetailResponse],
  ["피부 타입", "/skin-types", SkinTypesResponse],
  ["인기 검색어", "/search-keywords/rankings", RankingsResponse],
  ["인기 제품", "/products/rankings", ProductRankingResponse],
  ["인기 제품(카테고리)", "/products/rankings?categoryIds=1", ProductRankingResponse],
  ["내 정보", "/users/me", UserResponse],
  ["탈퇴 계정", "/auth/withdrawn", WithdrawnAccountResponse],
  ["이미 가입한 계정", "/auth/registered-account", RegisteredAccountResponse],
  ["선반", "/users/me/shelf/products", ShelfResponse],
  ["선반 제품 제안", "/users/me/shelf/product-suggestions?keyword=블랙", ShelfProductSuggestionPageResponse],
  ["안 맞을 수 있는 성분", "/users/me/shelf/ingredient-analysis", IngredientAnalysisResponse],
  ["나만의 필터", "/users/me/skin-filter", SkinFilterResponse],
] as const;

describe("목 응답과 스키마", () => {
  it.each(cases)("%s", async (_name, path, schema) => {
    const { status, body } = await get(path);

    expect(status).toBe(200);
    expect(deepStrict(schema).safeParse(body)).toMatchObject({ success: true });
  });

  it("제품명과 브랜드에 나뉘어 걸린 검색어도 연관검색어로 돌려준다", async () => {
    const { status, body } = await get(`/products/related-keywords?keyword=${encodeURIComponent("토너 라운드랩")}`);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      items: expect.arrayContaining([
        {
          keyword: "라운드랩 1025 독도 토너",
          matches: [
            { startIndex: 0, endIndexExclusive: 4 },
            { startIndex: 13, endIndexExclusive: 15 },
          ],
        },
      ]),
    });
  });

  it("빠른 제외 조회는 일반 성분군을 포함하지 않는다", async () => {
    const { items } = await fetchExcludeCodes();

    expect(items.map((group) => group.code)).toEqual(excludeCodes.map((group) => group.code).sort());
    expect(items.some((group) => group.code === "CERAMIDES")).toBe(false);
  });

  it("문의 접수는 내용 없이 204 를 준다", async () => {
    const { status, body } = await post(
      "/feedbacks",
      ...json({ type: "OTHER", content: "열 자가 넘는 내용", path: "/" }),
    );

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("제품 정보 정정 요청은 내용 없이 204 를 준다", async () => {
    const { status, body } = await post("/products/1/correction-requests", ...json({ content: "열 자가 넘는 내용" }));

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("이미지 업로드는 FeedbackImageUploadResponse 를 지킨다", async () => {
    const form = new FormData();
    form.append("images", new File(["a"], "a.png", { type: "image/png" }));

    const { status, body } = await post("/pending-images", form);

    expect(status).toBe(201);
    expect(deepStrict(FeedbackImageUploadResponse).safeParse(body)).toMatchObject({ success: true });
  });

  it("검색어 기록은 내용 없이 204 를 준다", async () => {
    const { status, body } = await post("/search-keywords", ...json({ keyword: "어성초" }));

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("제품 등록 요청은 내용 없이 202 를 준다", async () => {
    const { status, body } = await post("/products/registration-requests", ...json({ productName: "1025 독도 토너" }));

    expect(status).toBe(202);
    expect(body).toBeUndefined();
  });

  it.each([
    ["/feedbacks", "429 를 부르는 내용"],
    ["/products/registration-requests", "429 를 부르는 제품"],
  ])("%s 의 실패는 ProblemDetail 을 지킨다", async (path, text) => {
    const field = path === "/feedbacks" ? { type: "OTHER", content: text, path: "/" } : { productName: text };
    const { status, body } = await post(path, ...json(field));

    expect(status).toBe(429);
    expect(deepStrict(ProblemDetail).safeParse(body)).toMatchObject({ success: true });
  });

  it.each(["/products/9999", "/ingredients/9999", "/brands/9999", "/curations/9999"])(
    "%s 는 ProblemDetail 을 지킨다",
    async (path) => {
      const { status, body } = await get(path);

      expect(status).toBe(404);
      expect(deepStrict(ProblemDetail).safeParse(body)).toMatchObject({ success: true });
    },
  );

  /** 핸들러를 새로 만들고 검사를 빠뜨리면 알린다. */
  it("초기 정보 저장은 바뀐 UserResponse 를 지킨다", async () => {
    const { status, body } = await patch("/users/me/profile", {
      gender: "FEMALE",
      ageRange: "TWENTIES",
      skinType: "COMBINATION",
      sensitiveSkin: null,
    });

    expect(status).toBe(200);
    expect(deepStrict(UserResponse).safeParse(body)).toMatchObject({ success: true });
    expect(body).toMatchObject({ skinType: "COMBINATION" });
  });

  it("초기 정보에 모르는 값이 있으면 ProblemDetail 로 거절한다", async () => {
    const { status, body } = await patch("/users/me/profile", {
      gender: "OTHER",
      ageRange: null,
      skinType: null,
      sensitiveSkin: null,
    });

    expect(status).toBe(400);
    expect(deepStrict(ProblemDetail).safeParse(body)).toMatchObject({ success: true });
  });

  it("회원 탈퇴는 내용 없이 204 를 준다", async () => {
    const response = await fetch(`${BASE}/users/me`, { method: "DELETE" });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("제품 저장과 해제는 내용 없이 204 를 주고, 없는 제품 저장은 404 를 준다", async () => {
    const saved = await fetch(`${BASE}/users/me/wishlist/products/1`, { method: "PUT" });
    const unsaved = await fetch(`${BASE}/users/me/wishlist/products/1`, { method: "DELETE" });
    const missing = await fetch(`${BASE}/users/me/wishlist/products/999999`, { method: "PUT" });

    expect(saved.status).toBe(204);
    expect(unsaved.status).toBe(204);
    expect(missing.status).toBe(404);
    expect(deepStrict(ProblemDetail).safeParse(await missing.json())).toMatchObject({ success: true });
  });

  it("뺀 제품 되돌리기는 내용 없이 204 를 주고, 담은 적 없는 제품은 404 를 준다", async () => {
    await fetch(`${BASE}/users/me/wishlist/products/1`, { method: "PUT" });
    await fetch(`${BASE}/users/me/wishlist/products/1`, { method: "DELETE" });
    const restored = await post("/users/me/wishlist/products/1/restore", "");
    const missing = await post("/users/me/wishlist/products/999999/restore", "");

    expect(restored.status).toBe(204);
    expect(restored.body).toBeUndefined();
    expect(missing.status).toBe(404);
    expect(deepStrict(ProblemDetail).safeParse(missing.body)).toMatchObject({ success: true });
  });

  it("탈퇴 계정 복구 요청은 내용 없이 204 를 준다", async () => {
    const { status, body } = await post("/auth/withdrawn/restore", "");

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("회원가입은 내용 없이 204 를 준다", async () => {
    const { status, body } = await post("/auth/signup", "");

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("로그아웃은 내용 없이 204 를 준다", async () => {
    const { status, body } = await post("/users/logout", "");

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("선반 담기·수정은 ShelfProductResponse 를, 빼기는 204 를 준다", async () => {
    const added = await post("/users/me/shelf/products", ...json({ productId: 2, usageStatus: "IN_USE" }));
    const duplicated = await post("/users/me/shelf/products", ...json({ productId: 2, usageStatus: "IN_USE" }));
    const updated = await fetch(`${BASE}/users/me/shelf/products/2`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usageStatus: "USED", preference: "BAD", moistureLevel: 1.5, oilLevel: null }),
    });
    const removed = await fetch(`${BASE}/users/me/shelf/products/2`, { method: "DELETE" });
    resetMockShelf();

    expect(added.status).toBe(201);
    expect(deepStrict(ShelfProductResponse).safeParse(added.body)).toMatchObject({ success: true });
    expect(duplicated.status).toBe(409);
    expect(deepStrict(ProblemDetail).safeParse(duplicated.body)).toMatchObject({ success: true });
    expect(updated.status).toBe(200);
    expect(deepStrict(ShelfProductResponse).safeParse(await updated.json())).toMatchObject({ success: true });
    expect(removed.status).toBe(204);
  });

  it("나만의 필터 성분 추가와 삭제는 내용 없이 204 를 준다", async () => {
    const added = await post("/users/me/skin-filter/ingredients", ...json({ ingredientIds: [9001] }));
    const filter = await get("/users/me/skin-filter");
    const removed = await fetch(`${BASE}/users/me/skin-filter/ingredients?ingredientIds=9001`, { method: "DELETE" });
    resetMockShelf();

    expect(added.status).toBe(204);
    expect(filter.status).toBe(200);
    expect(deepStrict(SkinFilterResponse).safeParse(filter.body)).toMatchObject({ success: true });
    expect(filter.body).toMatchObject({ items: [{ id: 9001, excludeCodes: ["FRAGRANCE_ALLERGENS"] }] });
    expect(filter.body).not.toHaveProperty("items.0.groupCodes");
    expect(removed.status).toBe(204);
  });

  it("모든 핸들러를 검사한다", () => {
    /*
     * 성분 목록처럼 분기가 둘인 핸들러가 있어 경로에서 조회 문자열을 뗀 뒤 센다.
     * 제품 상세처럼 한 핸들러의 갈래를 나누어 검사하는 자리도 있어, 끝에 붙는
     * 번호는 하나로 묶어 같은 핸들러로 센다.
     */
    const tested = new Set(cases.map(([, path]) => path.split("?")[0].replace(/\/\d+$/, "/:id")));

    /* 보내는 요청은 it.each 로 따로 검사하므로 여기서 함께 센다. */
    const postPaths = [
      "/feedbacks",
      "/products/:id/correction-requests",
      "/pending-images",
      "/products/registration-requests",
      "/products/:id/views",
      "/search-keywords",
      "/users/me/profile",
      "/users/logout",
      "/users/me (DELETE)",
      "/users/me/wishlist/products/:id (PUT)",
      "/users/me/wishlist/products/:id (DELETE)",
      "/users/me/wishlist/products/:id/restore",
      "/auth/withdrawn/restore",
      "/auth/signup",
      "/users/me/shelf/products (POST)",
      "/users/me/shelf/products/:id (PUT)",
      "/users/me/shelf/products/:id (DELETE)",
      "/users/me/skin-filter/ingredients (POST)",
      "/users/me/skin-filter/ingredients (DELETE)",
    ];

    expect(tested.size + postPaths.length).toBe(handlers.length);
  });
});
