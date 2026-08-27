import {
  BrandDetailResponse,
  BrandOverviewResponse,
  CategoryListResponse,
  ExcludeCodeListResponse,
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

const cases = [
  ["제품 목록", "/products", ProductPageResponse],
  ["제품 수", "/products/count", ProductCountResponse],
  ["제품 제안", "/products/suggestions?keyword=블랙", ProductSuggestionPageResponse],
  ["제품 상세", "/products/1", ProductDetailResponse],
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

  it.each(["/products/9999", "/ingredients/9999", "/brands/9999"])("%s 는 ProblemDetail 을 지킨다", async (path) => {
    const { status, body } = await get(path);

    expect(status).toBe(404);
    expect(deepStrict(ProblemDetail).safeParse(body)).toMatchObject({ success: true });
  });

  /** 핸들러를 새로 만들고 검사를 빠뜨리면 알린다. */
  it("모든 핸들러를 검사한다", () => {
    // 성분 목록처럼 분기가 둘인 핸들러가 있어 경로에서 조회 문자열을 뗀 뒤 센다.
    const tested = new Set(cases.map(([, path]) => path.split("?")[0]));

    expect(tested.size).toBe(handlers.length);
  });
});
