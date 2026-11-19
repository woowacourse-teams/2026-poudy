import {
  ProductSimilarityResponse,
  SimilarProductResponse,
  UserProductResponse,
  UserSimilarProductResponse,
} from "@poudy/api/api.zod";
import { z } from "zod";

/**
 * 기준 제품과 함께 든 성분군(명세 S277 '겹치는 성분', 0~2개). 서버가 글리세린과 주의 성분군을 빼고 그 카테고리에서
 * 드문 것부터 준다(#1295). 화면은 이름만 쓴다.
 *
 * 생성 파일(api.zod)에 이 필드가 들어오기 전에도 받도록, 생성 스키마를 덮어쓰지 않고 교집합으로 더한다.
 * - 생성 스키마는 모르는 필드를 지우지만, 교집합의 이쪽이 이 필드를 남긴다.
 * - 생성 스키마에 필수 필드로 들어오면 교집합의 타입도 필수가 되어, 생성 타입을 받는 곳에 그대로 넘길 수 있다.
 * 생성 파일에 필드가 들어온 뒤에는 이 파일을 지우고 생성 스키마를 그대로 쓴다.
 */
const WithSharedIngredientGroups = z.object({
  sharedIngredientGroups: z.array(z.object({ code: z.string(), name: z.string() })).optional(),
});

export const SimilarProductWithGroups = SimilarProductResponse.and(WithSharedIngredientGroups);
export type SimilarProductWithGroups = z.infer<typeof SimilarProductWithGroups>;

export const ProductSimilarityWithGroups = ProductSimilarityResponse.extend({
  items: z.array(SimilarProductWithGroups),
});
export type ProductSimilarityWithGroups = z.infer<typeof ProductSimilarityWithGroups>;

/** 회원별 제품 정보의 비슷한 제품에도 같은 필드가 온다(#1295). */
export const UserProductWithGroups = UserProductResponse.extend({
  similarProducts: z.array(UserSimilarProductResponse.and(WithSharedIngredientGroups)),
});
