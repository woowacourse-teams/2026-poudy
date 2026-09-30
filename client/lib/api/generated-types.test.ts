import { CategoryListResponse, RankingItem } from "@poudy/api/api.zod";
import { describe, expectTypeOf, it } from "vitest";
import type { z } from "zod";

/*
 * 생성 파일(common/api.zod.ts)은 client/ 밖에 있고, 맨 위의 `// @ts-nocheck` 때문에 파일 안의
 * 오류를 알리지 않는다. 그래서 파일이 부르는 zod 를 찾지 못해도 조용히 넘어가고, 그 파일의
 * Zod 스키마가 모두 any 가 된다. any 인 스키마로 검사한 응답은 타입 검사를 받지 않는다.
 * tsconfig.json 의 zod 별칭이 빠지면 이런 일이 생긴다.
 *
 * 이 파일의 검사는 테스트 실행이 아니라 tsc --noEmit 에서 동작한다. 스키마가 any 가 되면
 * Type check 가 실패한다.
 */
describe("생성된 Zod 스키마", () => {
  it("스키마 값이 any 로 풀리지 않는다", () => {
    expectTypeOf(RankingItem).not.toBeAny();
    expectTypeOf(CategoryListResponse).not.toBeAny();
  });

  it("스키마로 검사한 값의 타입이 any 로 풀리지 않는다", () => {
    expectTypeOf<z.infer<typeof RankingItem>>().not.toBeAny();
    expectTypeOf<z.infer<typeof CategoryListResponse>>().not.toBeAny();
  });
});
