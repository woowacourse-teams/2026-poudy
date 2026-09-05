import {
  BrandDetailResponse,
  BrandOverviewResponse,
  CategoryListResponse,
  ExcludeCodeListResponse,
  FeedbackImageUploadResponse,
  IngredientDetailResponse,
  IngredientListResponse,
  IngredientPageResponse,
  ProblemDetail,
  ProductCountResponse,
  ProductDetailResponse,
  ProductPageResponse,
  ProductSuggestionPageResponse,
  StorageResponse,
} from "@poudy/api/api.zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { handlers } from "@/mocks/handlers";

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

const json = (body: unknown) => [JSON.stringify(body), { "Content-Type": "application/json" }] as const;

const cases = [
  ["제품 목록", "/products", ProductPageResponse],
  ["제품 수", "/products/count", ProductCountResponse],
  ["제품 제안", "/products/suggestions?keyword=블랙", ProductSuggestionPageResponse],
  ["제품 상세", "/products/1", ProductDetailResponse],
  // 손으로 적은 상세가 없는 제품은 목록 정보로 상세를 세운다. 그 자리도 스키마를 지켜야 한다.
  ["제품 상세(목록 정보로 세운 것)", "/products/9", ProductDetailResponse],
  ["저장함", "/storage?productIds=1,2", StorageResponse],
  ["성분 목록", "/ingredients", IngredientPageResponse],
  ["성분 목록(ID 조회)", "/ingredients?ingredientIds=1,2", IngredientPageResponse],
  ["성분 검색 제안", "/ingredients/suggestions?keyword=글리", IngredientListResponse],
  ["성분 상세", "/ingredients/1", IngredientDetailResponse],
  ["제외 성분군", "/exclude-codes", ExcludeCodeListResponse],
  ["카테고리", "/categories", CategoryListResponse],
  ["브랜드 목록", "/brands", BrandOverviewResponse],
  ["브랜드 상세", "/brands/1", BrandDetailResponse],
] as const;

describe("목 응답과 스키마", () => {
  it.each(cases)("%s", async (_name, path, schema) => {
    const { status, body } = await get(path);

    expect(status).toBe(200);
    expect(deepStrict(schema).safeParse(body)).toMatchObject({ success: true });
  });

  it("문의 접수는 내용 없이 204 를 준다", async () => {
    const { status, body } = await post(
      "/feedback",
      ...json({ type: "OTHER", content: "열 자가 넘는 내용", path: "/" }),
    );

    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("이미지 업로드는 FeedbackImageUploadResponse 를 지킨다", async () => {
    const form = new FormData();
    form.append("images", new File(["a"], "a.png", { type: "image/png" }));

    const { status, body } = await post("/feedback/images", form);

    expect(status).toBe(201);
    expect(deepStrict(FeedbackImageUploadResponse).safeParse(body)).toMatchObject({ success: true });
  });

  it("제품 등록 요청은 내용 없이 202 를 준다", async () => {
    const { status, body } = await post("/product-requests", ...json({ productName: "1025 독도 토너" }));

    expect(status).toBe(202);
    expect(body).toBeUndefined();
  });

  it.each([
    ["/feedback", "429 를 부르는 내용"],
    ["/product-requests", "429 를 부르는 제품"],
  ])("%s 의 실패는 ProblemDetail 을 지킨다", async (path, text) => {
    const field = path === "/feedback" ? { type: "OTHER", content: text, path: "/" } : { productName: text };
    const { status, body } = await post(path, ...json(field));

    expect(status).toBe(429);
    expect(deepStrict(ProblemDetail).safeParse(body)).toMatchObject({ success: true });
  });

  it.each(["/products/9999", "/ingredients/9999", "/brands/9999"])("%s 는 ProblemDetail 을 지킨다", async (path) => {
    const { status, body } = await get(path);

    expect(status).toBe(404);
    expect(deepStrict(ProblemDetail).safeParse(body)).toMatchObject({ success: true });
  });

  /** 핸들러를 새로 만들고 검사를 빠뜨리면 알린다. */
  it("모든 핸들러를 검사한다", () => {
    /*
     * 성분 목록처럼 분기가 둘인 핸들러가 있어 경로에서 조회 문자열을 뗀 뒤 센다.
     * 제품 상세처럼 한 핸들러의 갈래를 나누어 검사하는 자리도 있어, 끝에 붙는
     * 번호는 하나로 묶어 같은 핸들러로 센다.
     */
    const tested = new Set(cases.map(([, path]) => path.split("?")[0].replace(/\/\d+$/, "/:id")));

    /* 보내는 요청은 it.each 로 따로 검사하므로 여기서 함께 센다. */
    const postPaths = ["/feedback", "/feedback/images", "/product-requests"];

    expect(tested.size + postPaths.length).toBe(handlers.length);
  });
});
