import { pick } from "./optional";

/** 서버 `Ingredients.SEARCH_RESULT_LIMIT` 의 사본. */
export const INGREDIENT_SEARCH_LIMIT = 5;

export const ingredientCountLabel = (shown: number): string =>
  pick(shown < INGREDIENT_SEARCH_LIMIT, `${shown}개`, `${shown}개 이상`);
